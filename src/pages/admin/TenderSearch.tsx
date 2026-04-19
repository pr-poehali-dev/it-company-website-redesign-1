import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const TENDER_URL = "https://functions.poehali.dev/0d043904-1f56-48c0-bc77-ea7f394558a3";

const QUICK_QUERIES = [
  "разработка программного обеспечения",
  "искусственный интеллект",
  "информационная система",
  "цифровая трансформация",
  "кибербезопасность",
  "облачные сервисы",
  "веб-разработка",
  "мобильное приложение",
  "автоматизация бизнес-процессов",
  "чат-бот",
];

const SOURCES = [
  { key: "eis",    label: "ЕИС zakupki.gov.ru", icon: "Landmark",   color: "text-blue-400",    desc: "44-ФЗ / 223-ФЗ" },
  { key: "hh",     label: "HH.ru",              icon: "Briefcase",  color: "text-red-400",     desc: "Проекты" },
  { key: "habr",   label: "Habr Freelance",      icon: "Code2",      color: "text-emerald-400", desc: "IT-задания" },
  { key: "fl",     label: "FL.ru",               icon: "Layers",     color: "text-amber-400",   desc: "Фриланс" },
  { key: "kwork",  label: "Kwork",               icon: "Zap",        color: "text-violet-400",  desc: "Биржа задач" },
  { key: "upwork", label: "Upwork",              icon: "Globe2",     color: "text-cyan-400",    desc: "Международные" },
];

const SOURCE_COLORS: Record<string, string> = {
  "ЕИС zakupki.gov.ru": "bg-blue-500/20 text-blue-300",
  "HH.ru":              "bg-red-500/20 text-red-300",
  "Habr Freelance":     "bg-emerald-500/20 text-emerald-300",
  "FL.ru":              "bg-amber-500/20 text-amber-300",
  "Kwork":              "bg-violet-500/20 text-violet-300",
  "Upwork":             "bg-cyan-500/20 text-cyan-300",
};

interface Tender {
  id: string;
  name: string;
  price: number;
  price_fmt: string;
  customer: string;
  end_date: string;
  law: string;
  status: string;
  region: string;
  url: string;
  source: string;
  saved?: boolean;
}

interface SavedTender extends Tender {
  db_id: number;
  note: string;
  analysis: Analysis | null;
  created_at: string;
  external_id: string;
}

interface KpSection { title: string; content: string; }
interface Analysis {
  relevance_score: number;
  win_probability: number;
  relevance_comment: string;
  win_factors: string[];
  risks: string[];
  recommended_price: string;
  kp_structure: { title: string; sections: KpSection[] };
  key_requirements: string[];
  timeline: string;
  team: string;
  conclusion: string;
}
interface MetaItem { source: string; count: number; total: number; search_url: string; }
interface LinkItem  { source: string; url: string; }

interface TenderSearchProps { token: string; }

export default function TenderSearch({ token }: TenderSearchProps) {
  const [tab, setTab] = useState<"search" | "saved">("search");

  // Search
  const [query, setQuery]           = useState("");
  const [activeSources, setActiveSources] = useState<string[]>(SOURCES.map(s => s.key));
  const [tenders, setTenders]       = useState<Tender[]>([]);
  const [meta, setMeta]             = useState<MetaItem[]>([]);
  const [links, setLinks]           = useState<LinkItem[]>([]);
  const [warnings, setWarnings]     = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [searchError, setSearchError] = useState("");
  const [filterSource, setFilterSource] = useState("all");

  // Saved
  const [saved, setSaved]           = useState<SavedTender[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [editNote, setEditNote]     = useState<{ id: number; text: string } | null>(null);

  // Detail + analysis
  const [selected, setSelected]     = useState<Tender | null>(null);
  const [analysis, setAnalysis]     = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [kpExpanded, setKpExpanded] = useState(false);
  const [savingId, setSavingId]     = useState<string | null>(null);

  useEffect(() => { if (tab === "saved") loadSaved(); }, [tab]);

  function toggleSource(key: string) {
    setActiveSources(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function search(q?: string) {
    const sq = q ?? query;
    if (!sq.trim()) return;
    setLoading(true);
    setSearchError("");
    setWarnings([]);
    setTenders([]);
    setMeta([]);
    setLinks([]);
    setSelected(null);
    setAnalysis(null);
    setFilterSource("all");
    try {
      const res = await fetch(`${TENDER_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ query: sq, sources: activeSources }),
      });
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error || "Ошибка поиска"); return; }
      setTenders(data.tenders || []);
      setMeta(data.meta || []);
      setLinks(data.links || []);
      setWarnings(data.warnings || []);
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
        ...r,
        id: r.external_id,
        db_id: r.id,
        read: r.read_time,
        saved: true,
      })));
    } finally {
      setSavedLoading(false);
    }
  }

  async function saveTender(tender: Tender, currentAnalysis?: Analysis | null) {
    setSavingId(tender.id);
    try {
      const res = await fetch(`${TENDER_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ tender, analysis: currentAnalysis ?? analysis }),
      });
      if (res.ok) {
        setTenders(prev => prev.map(t => t.id === tender.id ? { ...t, saved: true } : t));
        if (tab === "saved") loadSaved();
      }
    } finally {
      setSavingId(null);
    }
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
    setSelected(tender);
    setAnalysis(null);
    setAnalyzeError("");
    setAnalyzing(true);
    setKpExpanded(false);
    try {
      const res = await fetch(`${TENDER_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ tender }),
      });
      const data = await res.json();
      if (!res.ok) { setAnalyzeError(data.error || "Ошибка"); return; }
      setAnalysis(data.analysis);
    } catch {
      setAnalyzeError("Ошибка ИИ-анализа");
    } finally {
      setAnalyzing(false);
    }
  }

  function scoreColor(s: number) { return s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-red-400"; }
  function scoreBar(s: number)   { return s >= 70 ? "bg-emerald-500"  : s >= 40 ? "bg-amber-500"  : "bg-red-500"; }

  const filteredTenders = filterSource === "all" ? tenders : tenders.filter(t => t.source === filterSource);
  const uniqueSources   = Array.from(new Set(tenders.map(t => t.source)));

  function TenderCard({ tender, onSelect, compact = false }: { tender: Tender; onSelect?: () => void; compact?: boolean }) {
    const isSaving = savingId === tender.id;
    return (
      <div
        onClick={onSelect}
        className={`glass rounded-2xl p-4 transition-all border ${onSelect ? "cursor-pointer" : ""} ${selected?.id === tender.id ? "border-violet-500/60 bg-violet-500/5" : "border-white/10 hover:border-white/20"}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${SOURCE_COLORS[tender.source] || "bg-white/10 text-white/50"}`}>
            {tender.source}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full ${tender.status === "Активный" || tender.status.includes("Подача") ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
              {tender.status}
            </span>
            <button
              onClick={e => { e.stopPropagation(); if (tender.saved) { unsaveTender(tender.id, tender.source); } else { saveTender(tender); } }}
              disabled={isSaving}
              title={tender.saved ? "Убрать из избранного" : "Сохранить"}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${tender.saved ? "bg-amber-500/20 text-amber-400 hover:bg-red-500/20 hover:text-red-400" : "glass border border-white/10 text-white/30 hover:text-amber-400 hover:border-amber-500/40"}`}
            >
              {isSaving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Bookmark" size={12} />}
            </button>
          </div>
        </div>

        <p className={`text-white font-medium leading-snug mb-2 ${compact ? "text-xs line-clamp-2" : "text-sm line-clamp-2"}`}>{tender.name}</p>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Icon name="DollarSign" size={11} className="text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-400 text-xs font-semibold">{tender.price_fmt}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="Building2" size={11} className="text-white/30 flex-shrink-0" />
            <span className="text-white/50 text-xs truncate">{tender.customer}</span>
          </div>
          {tender.region && tender.region !== "—" && (
            <div className="flex items-center gap-1.5">
              <Icon name="MapPin" size={11} className="text-white/30 flex-shrink-0" />
              <span className="text-white/40 text-xs truncate">{tender.region}</span>
            </div>
          )}
          {tender.end_date && tender.end_date !== "—" && (
            <div className="flex items-center gap-1.5">
              <Icon name="Calendar" size={11} className="text-white/30 flex-shrink-0" />
              <span className="text-white/40 text-xs">Срок: {tender.end_date}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
          {onSelect && (
            <button
              onClick={e => { e.stopPropagation(); analyze(tender); }}
              className="flex-1 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-medium flex items-center justify-center gap-1 transition-all"
            >
              <Icon name="Sparkles" size={11} /> ИИ-анализ
            </button>
          )}
          <a href={tender.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="py-1.5 px-3 rounded-lg glass border border-white/10 hover:border-white/20 text-white/40 hover:text-white text-xs flex items-center gap-1 transition-all">
            <Icon name="ExternalLink" size={11} />
          </a>
        </div>
      </div>
    );
  }

  function AnalysisPanel() {
    if (!selected) return (
      <div className="glass neon-border rounded-2xl p-8 text-center sticky top-24">
        <Icon name="MousePointerClick" size={36} className="text-white/10 mx-auto mb-3" />
        <p className="text-white/30 text-sm">Выберите тендер для анализа</p>
      </div>
    );

    return (
      <div className="space-y-4 sticky top-24">
        {/* Header */}
        <div className="glass neon-border rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[selected.source] || "bg-white/10 text-white/50"}`}>{selected.source}</span>
            <button onClick={() => { setSelected(null); setAnalysis(null); }} className="text-white/30 hover:text-white">
              <Icon name="X" size={14} />
            </button>
          </div>
          <p className="text-white font-medium text-sm leading-snug mb-3">{selected.name}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[["НМЦ", selected.price_fmt], ["Закон", selected.law], ["Срок", selected.end_date], ["Регион", selected.region]].map(([l, v]) => (
              <div key={l} className="glass rounded-lg p-2">
                <div className="text-white/30 mb-0.5">{l}</div>
                <div className="text-white font-medium truncate">{v}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-lg p-2 mt-2 text-xs">
            <div className="text-white/30 mb-0.5">Заказчик</div>
            <div className="text-white">{selected.customer}</div>
          </div>
          {!analysis && !analyzing && (
            <button onClick={() => analyze(selected)} className="w-full mt-3 py-2.5 btn-gradient rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2">
              <Icon name="Sparkles" size={15} /> Запустить ИИ-анализ
            </button>
          )}
        </div>

        {analyzing && (
          <div className="glass neon-border rounded-2xl p-6 text-center space-y-3">
            <Icon name="Sparkles" size={28} className="text-violet-400 mx-auto animate-pulse" />
            <p className="text-white font-medium text-sm">Анализирую тендер...</p>
            {["Читаю условия", "Оцениваю шансы", "Готовлю структуру КП"].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                <Icon name="Loader2" size={11} className="animate-spin flex-shrink-0" />{s}
              </div>
            ))}
          </div>
        )}

        {analyzeError && (
          <div className="glass border border-red-500/30 rounded-2xl p-4">
            <p className="text-red-400 text-sm mb-2">{analyzeError}</p>
            <button onClick={() => analyze(selected)} className="text-violet-400 text-xs hover:underline">Повторить</button>
          </div>
        )}

        {analysis && (
          <>
            {/* Scores */}
            <div className="glass neon-border rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                {[["Релевантность", analysis.relevance_score, ""], ["Шанс победы", analysis.win_probability, "%"]].map(([label, val, suffix]) => (
                  <div key={label as string} className="text-center">
                    <div className={`text-2xl font-bold font-oswald ${scoreColor(val as number)}`}>{val}{suffix}</div>
                    <div className="text-white/40 text-xs mt-0.5">{label}</div>
                    <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
                      <div className={`h-1 rounded-full ${scoreBar(val as number)}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/60 text-xs leading-relaxed">{analysis.relevance_comment}</p>
            </div>

            {/* Conclusion */}
            <div className={`glass rounded-2xl p-4 border ${analysis.win_probability >= 50 ? "border-emerald-500/30" : "border-amber-500/30"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name={analysis.win_probability >= 50 ? "CheckCircle" : "AlertTriangle"} size={14}
                  className={analysis.win_probability >= 50 ? "text-emerald-400" : "text-amber-400"} />
                <span className={`text-xs font-semibold ${analysis.win_probability >= 50 ? "text-emerald-400" : "text-amber-400"}`}>Вывод ИИ</span>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">{analysis.conclusion}</p>
            </div>

            {/* Factors & Risks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass neon-border rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon name="TrendingUp" size={12} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Факторы</span>
                </div>
                <ul className="space-y-1.5">
                  {analysis.win_factors.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-white/60">
                      <span className="text-emerald-400 flex-shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass neon-border rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon name="ShieldAlert" size={12} className="text-amber-400" />
                  <span className="text-xs font-semibold text-white">Риски</span>
                </div>
                <ul className="space-y-1.5">
                  {analysis.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-white/60">
                      <span className="text-amber-400 flex-shrink-0">!</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Details */}
            <div className="glass neon-border rounded-2xl p-4 space-y-2 text-xs">
              {[
                ["Tag", "Цена", analysis.recommended_price],
                ["Clock", "Сроки", analysis.timeline],
                ["Users", "Команда", analysis.team],
              ].map(([icon, label, val]) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon name={icon as "Tag"} size={12} className="text-violet-400 flex-shrink-0 mt-0.5" />
                  <div><span className="text-white/40">{label}: </span><span className="text-white/80">{val}</span></div>
                </div>
              ))}
              {analysis.key_requirements.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {analysis.key_requirements.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 glass border border-white/10 text-white/50 rounded-lg">{r}</span>
                  ))}
                </div>
              )}
            </div>

            {/* KP */}
            <div className="glass neon-border rounded-2xl overflow-hidden">
              <button onClick={() => setKpExpanded(e => !e)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                <div className="flex items-center gap-2">
                  <Icon name="FileText" size={14} className="text-violet-400" />
                  <span className="text-white text-sm font-semibold">Структура КП</span>
                </div>
                <Icon name={kpExpanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-white/40" />
              </button>
              {kpExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  <p className="text-violet-300 text-xs font-semibold">{analysis.kp_structure.title}</p>
                  {analysis.kp_structure.sections.map((s, i) => (
                    <div key={i} className="glass rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center font-bold flex-shrink-0">{i+1}</span>
                        <span className="text-white text-xs font-medium">{s.title}</span>
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed pl-6">{s.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => saveTender(selected, analysis)}
                disabled={selected.saved || savingId === selected.id}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${selected.saved ? "bg-amber-500/20 text-amber-400" : "glass border border-white/10 hover:border-amber-500/40 text-white/60 hover:text-amber-400"}`}
              >
                {savingId === selected.id ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Bookmark" size={13} />}
                {selected.saved ? "В избранном" : "Сохранить"}
              </button>
              <a href={selected.url} target="_blank" rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl glass border border-white/10 hover:border-white/20 text-xs text-white/60 hover:text-white flex items-center justify-center gap-1.5 transition-all">
                <Icon name="ExternalLink" size={13} /> Открыть
              </a>
              <button onClick={() => analyze(selected)} title="Обновить анализ"
                className="py-2.5 px-3 glass border border-white/10 hover:border-white/20 text-white/30 hover:text-white rounded-xl transition-all">
                <Icon name="RefreshCw" size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-oswald text-2xl font-bold text-white">Тендеры и задания</h2>
          <p className="text-white/40 text-sm mt-0.5">Поиск по всем источникам · ИИ-анализ · Избранное</p>
        </div>
        <div className="flex items-center gap-1 glass border border-white/10 rounded-xl p-1">
          <button onClick={() => setTab("search")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "search" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}>
            <Icon name="Search" size={14} className="inline mr-1.5" />Поиск
          </button>
          <button onClick={() => setTab("saved")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${tab === "saved" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}>
            <Icon name="Bookmark" size={14} />Избранное
            {saved.length > 0 && <span className={`text-xs px-1.5 rounded-full ${tab === "saved" ? "bg-white/20" : "bg-white/10"}`}>{saved.length}</span>}
          </button>
        </div>
      </div>

      {/* ── SEARCH TAB ───────────────────────────────────────────────── */}
      {tab === "search" && (
        <>
          {/* Sources */}
          <div className="glass neon-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 uppercase tracking-wider">Источники</span>
              <button onClick={() => setActiveSources(activeSources.length === SOURCES.length ? [] : SOURCES.map(s => s.key))}
                className="text-xs text-violet-400 hover:underline">
                {activeSources.length === SOURCES.length ? "Снять все" : "Выбрать все"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {SOURCES.map(s => {
                const active = activeSources.includes(s.key);
                return (
                  <button key={s.key} onClick={() => toggleSource(s.key)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${active ? "border-violet-500/50 bg-violet-500/10" : "glass border-white/10 opacity-40 hover:opacity-70"}`}>
                    <Icon name={s.icon as "Search"} size={16} className={active ? s.color : "text-white/40"} />
                    <span className={`font-medium text-center leading-tight ${active ? "text-white" : "text-white/50"}`}>{s.label}</span>
                    <span className={`text-center ${active ? "text-white/40" : "text-white/20"}`}>{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search input */}
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 glass neon-border focus-within:border-violet-500/50 rounded-xl px-4 py-3 transition-all">
              <Icon name="Search" size={18} className="text-white/30 flex-shrink-0" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder="Ключевые слова: разработка ИИ, кибербезопасность, веб-портал..."
                className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm" />
              {query && <button onClick={() => setQuery("")} className="text-white/30 hover:text-white"><Icon name="X" size={14} /></button>}
            </div>
            <button onClick={() => search()} disabled={loading || !query.trim() || activeSources.length === 0}
              className="btn-gradient px-6 rounded-xl font-semibold text-sm text-white flex items-center gap-2 disabled:opacity-50 min-w-[110px] justify-center">
              {loading ? <><Icon name="Loader2" size={15} className="animate-spin" />Поиск...</> : <><Icon name="Search" size={15} />Поиск</>}
            </button>
          </div>

          {/* Quick queries */}
          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES.map(q => (
              <button key={q} onClick={() => { setQuery(q); search(q); }}
                className="text-xs px-3 py-1.5 glass border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 text-white/50 hover:text-white rounded-lg transition-all">
                {q}
              </button>
            ))}
          </div>

          {/* Errors / warnings */}
          {searchError && (
            <div className="glass border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{searchError}</p>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="glass border border-amber-500/30 rounded-xl p-3 space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-300">
                  <Icon name="AlertTriangle" size={12} className="flex-shrink-0" />{w}
                </div>
              ))}
            </div>
          )}

          {/* Meta + links */}
          {(meta.length > 0 || links.length > 0) && (
            <div className="flex flex-wrap items-center gap-3">
              {meta.map(m => (
                <a key={m.source} href={m.search_url} target="_blank" rel="noreferrer"
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${SOURCE_COLORS[m.source] || "bg-white/10 text-white/50"} hover:opacity-80`}>
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

          {/* Source filter */}
          {tenders.length > 0 && uniqueSources.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterSource("all")}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filterSource === "all" ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/50 hover:text-white"}`}>
                Все ({tenders.length})
              </button>
              {uniqueSources.map(src => (
                <button key={src} onClick={() => setFilterSource(src)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filterSource === src ? "bg-violet-600 text-white" : `glass border border-white/10 text-white/50 hover:text-white`}`}>
                  {src} ({tenders.filter(t => t.source === src).length})
                </button>
              ))}
            </div>
          )}

          {/* Results grid */}
          {filteredTenders.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                {filteredTenders.map(tender => (
                  <TenderCard key={`${tender.id}::${tender.source}`} tender={tender}
                    onSelect={() => setSelected(t => t?.id === tender.id && t?.source === tender.source ? null : tender)} />
                ))}
              </div>
              <AnalysisPanel />
            </div>
          )}

          {!loading && tenders.length === 0 && !searchError && (
            <div className="text-center py-16">
              <Icon name="Search" size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Выберите источники, введите ключевые слова и нажмите «Поиск»</p>
            </div>
          )}
        </>
      )}

      {/* ── SAVED TAB ────────────────────────────────────────────────── */}
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
                    <TenderCard tender={t}
                      onSelect={() => { setSelected(t); setAnalysis(t.analysis ?? null); setKpExpanded(false); }} />
                    {/* Note */}
                    <div className="mt-1 px-1">
                      {editNote?.id === t.db_id ? (
                        <div className="flex gap-2">
                          <input value={editNote.text} onChange={e => setEditNote({ id: t.db_id, text: e.target.value })}
                            className="flex-1 glass border border-white/10 focus:border-violet-500/50 rounded-lg px-3 py-1.5 text-xs text-white bg-transparent outline-none"
                            placeholder="Заметка..." autoFocus onKeyDown={e => e.key === "Escape" && setEditNote(null)} />
                          <button onClick={() => saveNote(t.db_id, editNote.text)}
                            className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg">Сохранить</button>
                          <button onClick={() => setEditNote(null)} className="px-2 py-1.5 glass border border-white/10 text-white/40 text-xs rounded-lg">✕</button>
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
              <AnalysisPanel />
            </div>
          )}
        </>
      )}
    </div>
  );
}