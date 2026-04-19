import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import TenderCard from "./tender/TenderCard";
import TenderAnalysisPanel from "./tender/TenderAnalysisPanel";
import { TenderTabSearch, TenderTabCorporate } from "./tender/TenderTabContent";
import {
  TENDER_URL, CORP_LIST, MARKET_SOURCES,
  Tab, Tender, SavedTender, Analysis, MetaItem, LinkItem, CorpStatus,
} from "./tender/types";

export default function TenderSearch({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>("search");

  // Search state
  const [query, setQuery]                 = useState("");
  const [activeSources, setActiveSources] = useState<string[]>(MARKET_SOURCES.map(s => s.key));
  const [activeCorps, setActiveCorps]     = useState<string[]>(CORP_LIST.map(c => c.key));
  const [tenders, setTenders]             = useState<Tender[]>([]);
  const [meta, setMeta]                   = useState<MetaItem[]>([]);
  const [links, setLinks]                 = useState<LinkItem[]>([]);
  const [warnings, setWarnings]           = useState<string[]>([]);
  const [corpStatus, setCorpStatus]       = useState<CorpStatus[]>([]);
  const [loading, setLoading]             = useState(false);
  const [searchError, setSearchError]     = useState("");
  const [filterSource, setFilterSource]   = useState("all");
  const [sortBy, setSortBy]               = useState<"price" | "date">("price");
  const [filterStats, setFilterStats]     = useState<{ total_before: number; total_after: number; filtered_out: number } | null>(null);

  // Фильтры
  const [minPrice, setMinPrice]                 = useState("100000");
  const [minDaysLeft, setMinDaysLeft]           = useState("3");
  const [preferCommercial, setPreferCommercial] = useState(true);
  const [preferAdvance, setPreferAdvance]       = useState(true);
  const [filtersOpen, setFiltersOpen]           = useState(true);

  // Saved
  const [saved, setSaved]               = useState<SavedTender[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [editNote, setEditNote]         = useState<{ id: number; text: string } | null>(null);

  // Detail
  const [selected, setSelected]         = useState<Tender | null>(null);
  const [analysis, setAnalysis]         = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [savingId, setSavingId]         = useState<string | null>(null);

  useEffect(() => { if (tab === "saved") loadSaved(); }, [tab]);

  // ── API calls ──────────────────────────────────────────────────────────────

  async function search(q?: string) {
    const sq = (q ?? query).trim();
    if (!sq) return;
    setLoading(true);
    setSearchError(""); setWarnings([]); setTenders([]);
    setMeta([]); setLinks([]); setCorpStatus([]);
    setSelected(null); setAnalysis(null); setFilterSource("all"); setFilterStats(null);
    const corpKeys = tab === "corporate" ? activeCorps : [];
    const srcs     = tab === "search"    ? activeSources : [];
    try {
      const res = await fetch(`${TENDER_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          query: sq, sources: srcs, corp_keys: corpKeys,
          filters: {
            min_price:         Number(minPrice) || 0,
            min_days_left:     Number(minDaysLeft) || 0,
            prefer_commercial: preferCommercial,
            prefer_advance:    preferAdvance,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error || "Ошибка поиска"); return; }
      setTenders(data.tenders || []);
      setMeta(data.meta || []);
      setLinks(data.links || []);
      setWarnings(data.warnings || []);
      setCorpStatus(data.corp_status || []);
      setFilterStats(data.filter_stats || null);
    } catch {
      setSearchError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  async function loadSaved() {
    setSavedLoading(true);
    try {
      const res = await fetch(`${TENDER_URL}/saved`, { headers: { "X-Session-Token": token } });
      const data = await res.json();
      setSaved((data.saved || []).map((r: Record<string, unknown>) => ({
        ...r, id: r.external_id, db_id: r.id, saved: true,
      })));
    } finally { setSavedLoading(false); }
  }

  async function saveTender(tender: Tender, curAnalysis?: Analysis | null) {
    setSavingId(tender.id);
    try {
      const res = await fetch(`${TENDER_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ tender, analysis: curAnalysis ?? analysis }),
      });
      if (res.ok) {
        setTenders(prev => prev.map(t => t.id === tender.id && t.source === tender.source ? { ...t, saved: true } : t));
        if (tab === "saved") loadSaved();
      }
    } finally { setSavingId(null); }
  }

  async function unsaveTender(external_id: string, source: string) {
    await fetch(`${TENDER_URL}/save`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ external_id, source }),
    });
    setSaved(prev => prev.filter(t => !(t.external_id === external_id && t.source === source)));
    setTenders(prev => prev.map(t => t.id === external_id && t.source === source ? { ...t, saved: false } : t));
  }

  async function saveNote(id: number, note: string) {
    await fetch(`${TENDER_URL}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ id, note }),
    });
    setSaved(prev => prev.map(t => t.db_id === id ? { ...t, note } : t));
    setEditNote(null);
  }

  async function analyze(tender: Tender) {
    setSelected(tender); setAnalysis(null); setAnalyzeError("");
    setAnalyzing(true);
    try {
      const res = await fetch(`${TENDER_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ tender }),
      });
      const data = await res.json();
      if (!res.ok) { setAnalyzeError(data.error || "Ошибка"); return; }
      setAnalysis(data.analysis);
    } catch { setAnalyzeError("Ошибка ИИ-анализа"); }
    finally { setAnalyzing(false); }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const uniqueSources = Array.from(new Set(tenders.map(t => t.source)));
  const filtered = (filterSource === "all" ? tenders : tenders.filter(t => t.source === filterSource))
    .slice()
    .sort((a, b) => sortBy === "price" ? b.price - a.price : (b.end_date > a.end_date ? 1 : -1));

  // Shared props passed to both tab components
  const sharedProps = {
    query, loading, searchError,
    minPrice, minDaysLeft, preferCommercial, preferAdvance, filtersOpen,
    onQueryChange: setQuery,
    onSearch: search,
    onMinPriceChange: setMinPrice,
    onMinDaysLeftChange: setMinDaysLeft,
    onPreferCommercialChange: setPreferCommercial,
    onPreferAdvanceChange: setPreferAdvance,
    onFiltersOpenChange: setFiltersOpen,
    onResetFilters: () => { setMinPrice("100000"); setMinDaysLeft("3"); setPreferCommercial(true); setPreferAdvance(true); },
    tenders, filtered, uniqueSources, meta, links, warnings, filterStats,
    filterSource, sortBy, selected, analysis, analyzing, analyzeError, savingId,
    onFilterSourceChange: setFilterSource,
    onSortByChange: setSortBy,
    onSelect: (t: Tender) => setSelected(s => s?.id === t.id && s?.source === t.source ? null : t),
    onAnalyze: analyze,
    onSave: saveTender,
    onUnsave: unsaveTender,
    onClosePanel: () => { setSelected(null); setAnalysis(null); },
  };

  // ── Tabs config ────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "search",    label: "Биржи и ЕИС", icon: "Search" },
    { id: "corporate", label: "Корпорации",  icon: "Building2", badge: CORP_LIST.length },
    { id: "saved",     label: "Избранное",   icon: "Bookmark",  badge: saved.length || undefined },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-oswald text-2xl font-bold text-white">Тендеры и задания</h2>
          <p className="text-white/40 text-sm mt-0.5">Агрегатор всех источников · ИИ-анализ · Генерация КП</p>
        </div>
        <div className="flex items-center gap-1 glass border border-white/10 rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}>
              <Icon name={t.icon as "Search"} size={13} />
              <span className="hidden sm:block">{t.label}</span>
              {t.badge ? <span className={`text-xs px-1.5 rounded-full ${tab === t.id ? "bg-white/20" : "bg-white/10"}`}>{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Биржи и ЕИС ─────────────────────────────────────────── */}
      {tab === "search" && (
        <TenderTabSearch
          {...sharedProps}
          activeSources={activeSources}
          onActiveSourcesChange={setActiveSources}
        />
      )}

      {/* ── TAB: Корпорации ──────────────────────────────────────────── */}
      {tab === "corporate" && (
        <TenderTabCorporate
          {...sharedProps}
          activeCorps={activeCorps}
          corpStatus={corpStatus}
          onActiveCorpsChange={setActiveCorps}
        />
      )}

      {/* ── TAB: Избранное ────────────────────────────────────────────── */}
      {tab === "saved" && (
        <>
          {savedLoading && <div className="text-center py-20 text-white/40">Загрузка...</div>}
          {!savedLoading && saved.length === 0 && (
            <div className="text-center py-20">
              <Icon name="Bookmark" size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-sm">Нет сохранённых тендеров</p>
              <button onClick={() => setTab("search")} className="mt-4 text-violet-400 text-sm hover:underline">Перейти к поиску</button>
            </div>
          )}
          {!savedLoading && saved.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {saved.map(t => (
                  <div key={t.db_id}>
                    <TenderCard
                      tender={t}
                      isSelected={selected?.id === t.id && selected?.source === t.source}
                      savingId={savingId}
                      onSelect={() => { setSelected(t); setAnalysis(t.analysis ?? null); }}
                      onAnalyze={analyze}
                      onSave={saveTender}
                      onUnsave={unsaveTender}
                    />
                    <div className="mt-1 px-1">
                      {editNote?.id === t.db_id ? (
                        <div className="flex gap-2">
                          <input
                            value={editNote.text}
                            onChange={e => setEditNote({ id: t.db_id, text: e.target.value })}
                            className="flex-1 glass border border-white/10 focus:border-violet-500/50 rounded-lg px-3 py-1.5 text-xs text-white bg-transparent outline-none"
                            placeholder="Заметка..." autoFocus
                            onKeyDown={e => e.key === "Escape" && setEditNote(null)}
                          />
                          <button onClick={() => saveNote(t.db_id, editNote.text)} className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg">Сохранить</button>
                          <button onClick={() => setEditNote(null)} className="px-2 glass border border-white/10 text-white/40 text-xs rounded-lg">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditNote({ id: t.db_id, text: t.note || "" })}
                          className="text-xs text-white/30 hover:text-violet-400 flex items-center gap-1.5 transition-all">
                          <Icon name="Pencil" size={11} />
                          {t.note ? <span className="text-white/50 italic truncate max-w-xs">{t.note}</span> : "Добавить заметку"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <TenderAnalysisPanel
                selected={selected}
                analysis={analysis}
                analyzing={analyzing}
                analyzeError={analyzeError}
                savingId={savingId}
                onClose={() => { setSelected(null); setAnalysis(null); }}
                onAnalyze={analyze}
                onSave={saveTender}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
