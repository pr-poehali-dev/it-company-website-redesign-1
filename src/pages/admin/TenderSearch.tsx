import { useState } from "react";
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
];

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
}

interface KpSection {
  title: string;
  content: string;
}

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

interface TenderSearchProps {
  token: string;
}

export default function TenderSearch({ token }: TenderSearchProps) {
  const [query, setQuery] = useState("");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [searchUrl, setSearchUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Tender | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [kpExpanded, setKpExpanded] = useState(false);

  async function search(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    setWarning("");
    setTenders([]);
    setSelected(null);
    setAnalysis(null);
    try {
      const res = await fetch(`${TENDER_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка поиска"); return; }
      setTenders(data.tenders || []);
      setTotal(data.total || 0);
      setSearchUrl(data.search_url || "");
      if (data.warning) setWarning(data.warning);
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
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
      if (!res.ok) { setAnalyzeError(data.error || "Ошибка анализа"); return; }
      setAnalysis(data.analysis);
    } catch {
      setAnalyzeError("Ошибка ИИ-анализа");
    } finally {
      setAnalyzing(false);
    }
  }

  function scoreColor(score: number) {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  }

  function scoreBar(score: number) {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-oswald text-2xl font-bold text-white">Поиск тендеров</h2>
          <p className="text-white/40 text-sm mt-1">ЕИС zakupki.gov.ru · 44-ФЗ · 223-ФЗ · Коммерческие</p>
        </div>
        {searchUrl && (
          <a href={searchUrl} target="_blank" rel="noreferrer"
            className="glass border border-white/10 px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white flex items-center gap-2 transition-all">
            <Icon name="ExternalLink" size={13} />
            Открыть в ЕИС
          </a>
        )}
      </div>

      {/* Search box */}
      <div className="glass neon-border rounded-2xl p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 glass border border-white/10 focus-within:border-violet-500/50 rounded-xl px-4 py-3 transition-all">
            <Icon name="Search" size={18} className="text-white/30 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Например: разработка ИИ-системы, кибербезопасность, веб-портал..."
              className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-white/30 hover:text-white transition-all">
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => search()}
            disabled={loading || !query.trim()}
            className="btn-gradient px-6 py-3 rounded-xl font-semibold text-sm text-white flex items-center gap-2 disabled:opacity-50 min-w-[120px] justify-center"
          >
            {loading ? <><Icon name="Loader2" size={16} className="animate-spin" /> Поиск...</> : <><Icon name="Search" size={16} /> Поиск</>}
          </button>
        </div>

        {/* Quick queries */}
        <div className="flex flex-wrap gap-2">
          {QUICK_QUERIES.map(q => (
            <button
              key={q}
              onClick={() => { setQuery(q); search(q); }}
              className="text-xs px-3 py-1.5 glass border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 text-white/50 hover:text-white rounded-lg transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Warning / Error */}
      {warning && (
        <div className="glass border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <Icon name="AlertTriangle" size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm">{warning}</p>
            {searchUrl && (
              <a href={searchUrl} target="_blank" rel="noreferrer" className="text-violet-400 text-xs hover:underline mt-1 inline-flex items-center gap-1">
                Искать напрямую на zakupki.gov.ru <Icon name="ExternalLink" size={11} />
              </a>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="glass border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {tenders.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Tender list */}
          <div className="space-y-3">
            <p className="text-white/40 text-xs">Найдено: {total.toLocaleString()} · показано {tenders.length}</p>
            {tenders.map(tender => (
              <div
                key={tender.id}
                onClick={() => setSelected(t => t?.id === tender.id ? null : tender)}
                className={`glass rounded-2xl p-4 cursor-pointer transition-all border ${selected?.id === tender.id ? "border-violet-500/60 bg-violet-500/5" : "border-white/10 hover:border-white/20"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 flex-shrink-0">{tender.law}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${tender.status === 'Активный' || tender.status.includes('Подача') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                    {tender.status}
                  </span>
                </div>
                <p className="text-white text-sm font-medium leading-snug mb-3 line-clamp-2">{tender.name}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon name="DollarSign" size={12} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-400 text-sm font-semibold">{tender.price_fmt}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="Building2" size={12} className="text-white/30 flex-shrink-0" />
                    <span className="text-white/50 text-xs truncate">{tender.customer}</span>
                  </div>
                  {tender.region !== '—' && (
                    <div className="flex items-center gap-2">
                      <Icon name="MapPin" size={12} className="text-white/30 flex-shrink-0" />
                      <span className="text-white/40 text-xs truncate">{tender.region}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Icon name="Calendar" size={12} className="text-white/30 flex-shrink-0" />
                    <span className="text-white/40 text-xs">Срок подачи: {tender.end_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={e => { e.stopPropagation(); analyze(tender); }}
                    className="flex-1 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Icon name="Sparkles" size={12} />
                    ИИ-анализ + КП
                  </button>
                  <a
                    href={tender.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="py-1.5 px-3 rounded-lg glass border border-white/10 hover:border-white/20 text-white/40 hover:text-white text-xs flex items-center gap-1 transition-all"
                  >
                    <Icon name="ExternalLink" size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:sticky lg:top-24 space-y-4 self-start">
            {!selected && (
              <div className="glass neon-border rounded-2xl p-8 text-center">
                <Icon name="MousePointerClick" size={36} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Выберите тендер для просмотра деталей и ИИ-анализа</p>
              </div>
            )}

            {selected && !analysis && !analyzing && !analyzeError && (
              <div className="glass neon-border rounded-2xl p-5 space-y-4">
                <h3 className="font-oswald text-lg font-bold text-white leading-snug">{selected.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: "Hash", label: "Номер", value: selected.id },
                    { icon: "Scale", label: "Закон", value: selected.law },
                    { icon: "DollarSign", label: "НМЦ", value: selected.price_fmt },
                    { icon: "Calendar", label: "Срок", value: selected.end_date },
                  ].map(f => (
                    <div key={f.label} className="glass rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon name={f.icon as "Hash"} size={11} className="text-white/30" />
                        <span className="text-white/30 text-xs">{f.label}</span>
                      </div>
                      <p className="text-white text-sm font-medium truncate">{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon name="Building2" size={11} className="text-white/30" />
                    <span className="text-white/30 text-xs">Заказчик</span>
                  </div>
                  <p className="text-white text-sm">{selected.customer}</p>
                </div>
                {selected.region !== '—' && (
                  <div className="glass rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name="MapPin" size={11} className="text-white/30" />
                      <span className="text-white/30 text-xs">Регион</span>
                    </div>
                    <p className="text-white text-sm">{selected.region}</p>
                  </div>
                )}
                <button
                  onClick={() => analyze(selected)}
                  className="w-full py-3 btn-gradient rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                >
                  <Icon name="Sparkles" size={16} />
                  Запустить ИИ-анализ и сформировать КП
                </button>
              </div>
            )}

            {analyzing && (
              <div className="glass neon-border rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center mx-auto">
                  <Icon name="Sparkles" size={24} className="animate-pulse text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">ИИ анализирует тендер...</p>
                  <p className="text-white/40 text-sm">Оцениваем шансы, готовим структуру КП</p>
                </div>
                <div className="space-y-2 text-left">
                  {["Анализ требований тендера", "Оценка релевантности компании", "Расчёт шанса победы", "Формирование структуры КП"].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                      <Icon name="Loader2" size={12} className="animate-spin flex-shrink-0" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analyzeError && (
              <div className="glass border border-red-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="AlertCircle" size={16} className="text-red-400" />
                  <span className="text-red-400 font-medium text-sm">Ошибка анализа</span>
                </div>
                <p className="text-white/50 text-sm">{analyzeError}</p>
                <button onClick={() => selected && analyze(selected)} className="mt-3 text-violet-400 text-xs hover:underline">
                  Попробовать снова
                </button>
              </div>
            )}

            {analysis && selected && (
              <div className="space-y-4">
                {/* Scores */}
                <div className="glass neon-border rounded-2xl p-5">
                  <h3 className="font-oswald text-lg font-bold text-white mb-4">Оценка тендера</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold font-oswald ${scoreColor(analysis.relevance_score)}`}>
                        {analysis.relevance_score}
                      </div>
                      <div className="text-white/40 text-xs mt-1">Релевантность</div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${scoreBar(analysis.relevance_score)}`} style={{ width: `${analysis.relevance_score}%` }} />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold font-oswald ${scoreColor(analysis.win_probability)}`}>
                        {analysis.win_probability}%
                      </div>
                      <div className="text-white/40 text-xs mt-1">Шанс победы</div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${scoreBar(analysis.win_probability)}`} style={{ width: `${analysis.win_probability}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{analysis.relevance_comment}</p>
                </div>

                {/* Conclusion */}
                <div className={`glass rounded-2xl p-4 border ${analysis.win_probability >= 50 ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={analysis.win_probability >= 50 ? "CheckCircle" : "AlertTriangle"} size={16}
                      className={analysis.win_probability >= 50 ? "text-emerald-400" : "text-amber-400"} />
                    <span className={`text-sm font-semibold ${analysis.win_probability >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                      Вывод ИИ
                    </span>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{analysis.conclusion}</p>
                </div>

                {/* Win factors & Risks */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass neon-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="TrendingUp" size={14} className="text-emerald-400" />
                      <span className="text-sm font-semibold text-white">Факторы победы</span>
                    </div>
                    <ul className="space-y-2">
                      {analysis.win_factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                          <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass neon-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="ShieldAlert" size={14} className="text-amber-400" />
                      <span className="text-sm font-semibold text-white">Риски</span>
                    </div>
                    <ul className="space-y-2">
                      {analysis.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                          <span className="text-amber-400 flex-shrink-0 mt-0.5">!</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Key details */}
                <div className="glass neon-border rounded-2xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-white">Детали реализации</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Icon name="Tag" size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
                      <div><span className="text-white/40 text-xs">Рекомендуемая цена: </span><span className="text-white/80">{analysis.recommended_price}</span></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="Clock" size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
                      <div><span className="text-white/40 text-xs">Сроки: </span><span className="text-white/80">{analysis.timeline}</span></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="Users" size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
                      <div><span className="text-white/40 text-xs">Команда: </span><span className="text-white/80">{analysis.team}</span></div>
                    </div>
                  </div>
                  {analysis.key_requirements.length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs mb-2">Ключевые требования:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.key_requirements.map((r, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 glass border border-white/10 text-white/60 rounded-lg">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* KP Structure */}
                <div className="glass neon-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setKpExpanded(e => !e)}
                    className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="FileText" size={16} className="text-violet-400" />
                      <span className="font-semibold text-white text-sm">Структура коммерческого предложения</span>
                    </div>
                    <Icon name={kpExpanded ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/40" />
                  </button>
                  {kpExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-white/5">
                      <p className="text-violet-300 font-semibold text-sm pt-4">{analysis.kp_structure.title}</p>
                      {analysis.kp_structure.sections.map((section, i) => (
                        <div key={i} className="glass rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-white font-medium text-sm">{section.title}</span>
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed pl-7">{section.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <a href={selected.url} target="_blank" rel="noreferrer"
                    className="flex-1 py-2.5 glass border border-white/10 hover:border-violet-500/40 rounded-xl text-sm text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all">
                    <Icon name="ExternalLink" size={14} />
                    Открыть тендер
                  </a>
                  <button
                    onClick={() => analyze(selected)}
                    className="py-2.5 px-4 glass border border-white/10 hover:border-violet-500/40 rounded-xl text-sm text-white/40 hover:text-white flex items-center gap-2 transition-all"
                    title="Обновить анализ"
                  >
                    <Icon name="RefreshCw" size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state after search */}
      {!loading && tenders.length === 0 && !error && !warning && (
        <div className="text-center py-16">
          <Icon name="Search" size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Введите ключевые слова и нажмите «Поиск»</p>
          <p className="text-white/20 text-xs mt-1">Поиск по 44-ФЗ, 223-ФЗ и коммерческим закупкам</p>
        </div>
      )}
    </div>
  );
}
