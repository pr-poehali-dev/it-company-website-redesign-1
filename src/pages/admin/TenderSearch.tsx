import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import TenderCard from "./tender/TenderCard";
import TenderAnalysisPanel from "./tender/TenderAnalysisPanel";
import {
  TENDER_URL, QUICK_QUERIES, MARKET_SOURCES, CORP_LIST,
  Tab, Tender, SavedTender, Analysis, MetaItem, LinkItem, CorpStatus,
  sourceColor,
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
  const [minPrice, setMinPrice]               = useState("100000");
  const [minDaysLeft, setMinDaysLeft]         = useState("3");
  const [preferCommercial, setPreferCommercial] = useState(true);
  const [preferAdvance, setPreferAdvance]     = useState(true);
  const [filtersOpen, setFiltersOpen]         = useState(true);

  // Saved
  const [saved, setSaved]               = useState<SavedTender[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [editNote, setEditNote]         = useState<{ id: number; text: string } | null>(null);

  // Detail
  const [selected, setSelected]       = useState<Tender | null>(null);
  const [analysis, setAnalysis]       = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [savingId, setSavingId]       = useState<string | null>(null);

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
            min_price:        Number(minPrice) || 0,
            min_days_left:    Number(minDaysLeft) || 0,
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

  // ── Shared sub-views ───────────────────────────────────────────────────────

  function SearchBar() {
    return (
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 glass neon-border focus-within:border-violet-500/50 rounded-xl px-4 py-3 transition-all">
          <Icon name="Search" size={18} className="text-white/30 flex-shrink-0" />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Ключевые слова: разработка ИИ, кибербезопасность, ERP-система..."
            className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
          />
          {query && <button onClick={() => setQuery("")} className="text-white/30 hover:text-white"><Icon name="X" size={14} /></button>}
        </div>
        <button
          onClick={() => search()} disabled={loading || !query.trim()}
          className="btn-gradient px-6 rounded-xl font-semibold text-sm text-white flex items-center gap-2 disabled:opacity-50 min-w-[110px] justify-center"
        >
          {loading ? <><Icon name="Loader2" size={15} className="animate-spin" />Поиск...</> : <><Icon name="Search" size={15} />Поиск</>}
        </button>
      </div>
    );
  }

  function FiltersPanel() {
    return (
      <div className="glass neon-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-2">
            <Icon name="SlidersHorizontal" size={14} className="text-violet-400" />
            <span className="text-sm font-medium text-white">Фильтры заказов</span>
            <div className="flex items-center gap-1.5 ml-2">
              {Number(minPrice) > 0 && (
                <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">
                  от {Number(minPrice).toLocaleString("ru")} ₽
                </span>
              )}
              {Number(minDaysLeft) > 0 && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                  ≥{minDaysLeft} дн.
                </span>
              )}
              {preferCommercial && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">Коммерческие</span>
              )}
              {preferAdvance && (
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">Аванс</span>
              )}
            </div>
          </div>
          <Icon name={filtersOpen ? "ChevronUp" : "ChevronDown"} size={14} className="text-white/40" />
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-white/5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Минимальная сумма */}
            <div>
              <label className="block text-xs text-white/50 mb-2 flex items-center gap-1.5">
                <Icon name="DollarSign" size={11} className="text-emerald-400" />
                Сумма от (₽)
              </label>
              <div className="flex items-center gap-2 glass border border-white/10 focus-within:border-violet-500/50 rounded-xl px-3 py-2 transition-all">
                <input
                  type="number" value={minPrice} min={0} step={10000}
                  onChange={e => setMinPrice(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm outline-none w-full"
                  placeholder="100000"
                />
                {Number(minPrice) > 0 && (
                  <button onClick={() => setMinPrice("0")} className="text-white/30 hover:text-white flex-shrink-0">
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
              <div className="flex gap-1 mt-1.5">
                {["100000", "500000", "1000000"].map(v => (
                  <button key={v} onClick={() => setMinPrice(v)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-all ${minPrice === v ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/40 hover:text-white"}`}>
                    {Number(v) >= 1000000 ? `${Number(v)/1000000}М` : `${Number(v)/1000}К`}
                  </button>
                ))}
              </div>
            </div>

            {/* Минимальный срок */}
            <div>
              <label className="block text-xs text-white/50 mb-2 flex items-center gap-1.5">
                <Icon name="Calendar" size={11} className="text-blue-400" />
                Срок подачи — не менее дней
              </label>
              <div className="flex items-center gap-2 glass border border-white/10 focus-within:border-violet-500/50 rounded-xl px-3 py-2 transition-all">
                <input
                  type="number" value={minDaysLeft} min={0} max={365}
                  onChange={e => setMinDaysLeft(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                  placeholder="3"
                />
                {Number(minDaysLeft) > 0 && (
                  <button onClick={() => setMinDaysLeft("0")} className="text-white/30 hover:text-white flex-shrink-0">
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
              <div className="flex gap-1 mt-1.5">
                {["3", "7", "14", "30"].map(v => (
                  <button key={v} onClick={() => setMinDaysLeft(v)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-all ${minDaysLeft === v ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/40 hover:text-white"}`}>
                    {v}д
                  </button>
                ))}
              </div>
            </div>

            {/* Предпочтения */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs text-white/50 mb-2 flex items-center gap-1.5">
                <Icon name="Star" size={11} className="text-amber-400" />
                Предпочтения (поднимают в топ)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPreferCommercial(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${preferCommercial ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "glass border-white/10 text-white/40 hover:text-white"}`}
                >
                  <Icon name={preferCommercial ? "CheckCircle" : "Circle"} size={14} />
                  Коммерческие заказы
                </button>
                <button
                  onClick={() => setPreferAdvance(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${preferAdvance ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "glass border-white/10 text-white/40 hover:text-white"}`}
                >
                  <Icon name={preferAdvance ? "CheckCircle" : "Circle"} size={14} />
                  С авансом / предоплатой
                </button>
                <button
                  onClick={() => { setMinPrice("100000"); setMinDaysLeft("3"); setPreferCommercial(true); setPreferAdvance(true); }}
                  className="text-xs px-3 py-2 glass border border-white/10 text-white/30 hover:text-violet-400 hover:border-violet-500/40 rounded-xl transition-all"
                >
                  Сбросить к рекомендованным
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function QuickQueries() {
    return (
      <div className="flex flex-wrap gap-2">
        {QUICK_QUERIES.map(q => (
          <button key={q} onClick={() => { setQuery(q); search(q); }}
            className="text-xs px-3 py-1.5 glass border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 text-white/50 hover:text-white rounded-lg transition-all">
            {q}
          </button>
        ))}
      </div>
    );
  }

  function ResultsArea() {
    if (!tenders.length && !links.length && !warnings.length) return null;
    return (
      <>
        {warnings.length > 0 && (
          <div className="glass border border-amber-500/30 rounded-xl p-3 space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-amber-300">
                <Icon name="AlertTriangle" size={12} className="flex-shrink-0" />{w}
              </div>
            ))}
          </div>
        )}

        {/* Статистика фильтрации */}
        {filterStats && filterStats.filtered_out > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/40 px-1">
            <Icon name="Filter" size={12} className="text-violet-400" />
            <span>
              Найдено <span className="text-white/70 font-medium">{filterStats.total_before}</span>,
              после фильтров показано <span className="text-white font-medium">{filterStats.total_after}</span>
              {" "}— скрыто {filterStats.filtered_out}
            </span>
          </div>
        )}

        {(meta.length > 0 || links.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {meta.map(m => (
              <a key={m.source} href={m.search_url} target="_blank" rel="noreferrer"
                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-80 transition-all ${sourceColor(m.source)}`}>
                {m.source}: {m.count} <Icon name="ExternalLink" size={10} />
              </a>
            ))}
            {links.map(l => (
              <a key={l.source} href={l.url} target="_blank" rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg glass border border-white/10 text-white/40 hover:text-white flex items-center gap-1.5 transition-all">
                {l.source} <Icon name="ExternalLink" size={10} />
              </a>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterSource("all")}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filterSource === "all" ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/50 hover:text-white"}`}>
                Все ({tenders.length})
              </button>
              {uniqueSources.map(src => (
                <button key={src} onClick={() => setFilterSource(src)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filterSource === src ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/50 hover:text-white"}`}>
                  {src} ({tenders.filter(t => t.source === src).length})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">Сортировка:</span>
              {(["price", "date"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${sortBy === s ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/50 hover:text-white"}`}>
                  {s === "price" ? "По цене" : "По дате"}
                </button>
              ))}
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {filtered.map(t => (
                <TenderCard
                  key={`${t.id}::${t.source}`}
                  tender={t}
                  isSelected={selected?.id === t.id && selected?.source === t.source}
                  savingId={savingId}
                  onSelect={() => setSelected(s => s?.id === t.id && s?.source === t.source ? null : t)}
                  onAnalyze={analyze}
                  onSave={saveTender}
                  onUnsave={unsaveTender}
                />
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
    );
  }

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
        <>
          <div className="glass neon-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 uppercase tracking-wider">Источники поиска</span>
              <button onClick={() => setActiveSources(activeSources.length === MARKET_SOURCES.length ? [] : MARKET_SOURCES.map(s => s.key))}
                className="text-xs text-violet-400 hover:underline">
                {activeSources.length === MARKET_SOURCES.length ? "Снять все" : "Выбрать все"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {MARKET_SOURCES.map(s => {
                const on = activeSources.includes(s.key);
                return (
                  <button key={s.key}
                    onClick={() => setActiveSources(prev => on ? prev.filter(k => k !== s.key) : [...prev, s.key])}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${on ? "border-violet-500/50 bg-violet-500/10" : "glass border-white/10 opacity-40 hover:opacity-70"}`}>
                    <Icon name={s.icon as "Search"} size={16} className={on ? s.color : "text-white/40"} />
                    <span className={`font-medium text-center leading-tight ${on ? "text-white" : "text-white/50"}`}>{s.label}</span>
                    <span className={on ? "text-white/40" : "text-white/20"}>{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <FiltersPanel />
          <SearchBar />
          <QuickQueries />
          {searchError && (
            <div className="glass border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{searchError}</p>
            </div>
          )}
          <ResultsArea />
          {!loading && !tenders.length && !searchError && (
            <div className="text-center py-14">
              <Icon name="Search" size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Выберите источники, введите запрос и нажмите «Поиск»</p>
            </div>
          )}
        </>
      )}

      {/* ── TAB: Корпорации ──────────────────────────────────────────── */}
      {tab === "corporate" && (
        <>
          <div className="glass neon-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 uppercase tracking-wider">Выберите компании</span>
              <button onClick={() => setActiveCorps(activeCorps.length === CORP_LIST.length ? [] : CORP_LIST.map(c => c.key))}
                className="text-xs text-violet-400 hover:underline">
                {activeCorps.length === CORP_LIST.length ? "Снять все" : "Выбрать все"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {CORP_LIST.map(c => {
                const on = activeCorps.includes(c.key);
                const st = corpStatus.find(s => s.key === c.key);
                return (
                  <button key={c.key}
                    onClick={() => setActiveCorps(prev => on ? prev.filter(k => k !== c.key) : [...prev, c.key])}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all text-left ${on ? "border-violet-500/50 bg-violet-500/10" : "glass border-white/10 opacity-50 hover:opacity-80"}`}>
                    <span className="text-xl flex-shrink-0">{c.icon}</span>
                    <div className="min-w-0">
                      <div className={`font-medium truncate ${on ? "text-white" : "text-white/60"}`}>{c.name}</div>
                      {st && (
                        <div className={`text-xs mt-0.5 ${st.ok ? (st.count > 0 ? "text-emerald-400" : "text-white/30") : "text-red-400"}`}>
                          {st.ok ? (st.count > 0 ? `${st.count} найдено` : "Ссылка") : st.error || "Недоступен"}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <FiltersPanel />
          <SearchBar />
          <QuickQueries />
          {searchError && (
            <div className="glass border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <Icon name="AlertCircle" size={16} className="text-red-400" />
              <p className="text-red-300 text-sm">{searchError}</p>
            </div>
          )}
          <ResultsArea />

          {corpStatus.length > 0 && (
            <div className="glass neon-border rounded-2xl p-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Статус источников</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {corpStatus.map(s => (
                  <div key={s.key} className="glass rounded-xl p-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.ok ? (s.count > 0 ? "bg-emerald-500" : "bg-white/20") : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <div className="text-white text-xs font-medium truncate">{s.icon} {s.name}</div>
                      <div className={`text-xs ${s.ok ? (s.count > 0 ? "text-emerald-400" : "text-white/30") : "text-red-400"}`}>
                        {s.ok ? (s.count > 0 ? `${s.count} тендеров` : "Только ссылка") : s.error || "Ошибка"}
                      </div>
                    </div>
                    {(s.link_only || s.count === 0) && (
                      <a href={s.search_url} target="_blank" rel="noreferrer" className="ml-auto text-white/30 hover:text-white flex-shrink-0">
                        <Icon name="ExternalLink" size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !tenders.length && !searchError && corpStatus.length === 0 && (
            <div className="text-center py-14">
              <Icon name="Building2" size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Выберите компании, введите запрос и нажмите «Поиск»</p>
              <p className="text-white/20 text-xs mt-1">Система проверит страницы закупок каждой компании и API</p>
            </div>
          )}
        </>
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