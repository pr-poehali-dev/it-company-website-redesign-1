import { useState } from "react";
import Icon from "@/components/ui/icon";
import { REGIONS, INDUSTRIES, TECH_TAG_COLORS, POTENTIAL_CONFIG } from "./prospects/TechRadarTypes";

const AGENT_URL = "https://functions.poehali.dev/401fd6b1-332e-454e-a93d-f90b30785044";

interface PipelineHealth {
  score: number;
  verdict: string;
  comment: string;
}

interface Opportunity {
  company: string;
  reason: string;
  action: string;
}

interface Risk {
  company: string;
  risk: string;
  mitigation: string;
}

interface Strategy {
  focus: string;
  channels: string[];
  messaging: string;
  timeline: string;
}

interface Segment {
  name: string;
  count: number;
  approach: string;
}

interface StrategyReport {
  executive_summary: string;
  pipeline_health: PipelineHealth;
  top_opportunities: Opportunity[];
  risks: Risk[];
  strategy: Strategy;
  quick_wins: string[];
  segments: Segment[];
}

interface LeadRec {
  company: string;
  status: string;
  segment?: string;
  warm_signals?: string;
  next_step: string;
  email_subject: string;
  email_body: string;
  call_script: string;
  offer: string;
  timing: string;
}

interface Report {
  generated_at: string;
  total_prospects: number;
  strategy: StrategyReport;
  leads_recommendations: LeadRec[];
}

interface RadarSignal {
  company_name: string;
  inn: string;
  region: string;
  industry: string;
  tech_tags: string[];
  signal: string;
  potential: string;
  website: string;
  source: string;
  ai_score?: number;
  ai_summary?: string;
  ai_reasons?: string[];
  next_action?: string;
}

interface RadarToCrmResult {
  ok: boolean;
  error?: string;
  radar_summary: string;
  hot_industries: string[];
  regional_trends: string[];
  total_found: number;
  inserted: number;
  skipped: number;
  errors: number;
  signals: RadarSignal[];
}

const VERDICT_COLOR: Record<string, string> = {
  "отлично": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "хорошо": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  "требует внимания": "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "критично": "text-red-400 bg-red-500/10 border-red-500/30",
};

const TIMING_COLOR: Record<string, string> = {
  "сегодня": "text-red-400 bg-red-500/10",
  "эта неделя": "text-amber-400 bg-amber-500/10",
  "следующая неделя": "text-cyan-400 bg-cyan-500/10",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-white/30 hover:text-white/70 transition-colors"
    >
      <Icon name={copied ? "Check" : "Copy"} size={12} />
      {copied ? "Скопировано" : "Копировать"}
    </button>
  );
}

export default function AgentModule({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"strategy" | "leads">("strategy");
  const [expandedLead, setExpandedLead] = useState<number | null>(null);

  // Авто-разведка
  const [mainTab, setMainTab] = useState<"report" | "scout">("report");
  const [scoutRegion, setScoutRegion] = useState("Москва");
  const [scoutIndustry, setScoutIndustry] = useState("Все отрасли");
  const [scoutEnrich, setScoutEnrich] = useState(true);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutStep, setScoutStep] = useState<"idle" | "radar" | "enrich" | "save" | "done">("idle");
  const [scoutResult, setScoutResult] = useState<RadarToCrmResult | null>(null);
  const [scoutError, setScoutError] = useState("");
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);

  async function runScout() {
    setScoutLoading(true);
    setScoutError("");
    setScoutResult(null);
    setExpandedSignal(null);
    try {
      setScoutStep("radar");
      const res = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "radar_to_crm",
          region: scoutRegion,
          industry: scoutIndustry === "Все отрасли" ? "" : scoutIndustry,
          enrich: scoutEnrich,
        }),
      });
      const data: RadarToCrmResult = await res.json();
      if (data.ok) {
        setScoutResult(data);
        setScoutStep("done");
      } else {
        setScoutError(data.error || "Ошибка");
        setScoutStep("idle");
      }
    } catch {
      setScoutError("Ошибка соединения");
      setScoutStep("idle");
    } finally {
      setScoutLoading(false);
    }
  }

  async function generateReport() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "generate_report" }),
      });
      const data = await res.json();
      if (data.ok) {
        setReport(data.report);
        setActiveTab("strategy");
      } else {
        setError(data.error || "Ошибка генерации");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  const s = report?.strategy;
  const health = s?.pipeline_health;
  const verdictCls = VERDICT_COLOR[health?.verdict?.toLowerCase() || ""] || "text-white/50 bg-white/5 border-white/10";

  const SCOUT_STEPS = [
    { key: "radar", label: "Радар ищет компании", icon: "Radar" },
    { key: "enrich", label: "AI обогащает данные", icon: "BrainCircuit" },
    { key: "save", label: "Сохраняю в CRM", icon: "DatabaseZap" },
  ];
  const currentStepIdx = SCOUT_STEPS.findIndex(s => s.key === scoutStep);

  return (
    <div className="space-y-6">
      {/* Header + главные вкладки */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-oswald font-bold text-xl text-white flex items-center gap-2">
              <Icon name="BrainCircuit" size={22} className="text-violet-400" />
              AI-агент продаж
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              Анализирует CRM, генерирует стратегию и автоматически собирает лидов
            </p>
          </div>
        </div>

        {/* Главные табы */}
        <div className="flex gap-1 glass border border-white/10 rounded-xl p-1 w-fit">
          {([
            { key: "report", label: "Отчёт по CRM", icon: "BarChart2" },
            { key: "scout", label: "Авто-разведка", icon: "Radar" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === t.key ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== АВТО-РАЗВЕДКА ===== */}
      {mainTab === "scout" && (
        <div className="space-y-5">
          {/* Форма */}
          <div className="glass border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="Radar" size={16} className="text-violet-400" />
              <span className="text-sm font-semibold text-white">Настройки разведки</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Регион</label>
                <select
                  value={scoutRegion}
                  onChange={e => setScoutRegion(e.target.value)}
                  disabled={scoutLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {REGIONS.map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Отрасль</label>
                <select
                  value={scoutIndustry}
                  onChange={e => setScoutIndustry(e.target.value)}
                  disabled={scoutLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {INDUSTRIES.map(i => <option key={i} value={i} className="bg-gray-900">{i}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => !scoutLoading && setScoutEnrich(!scoutEnrich)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${scoutEnrich ? "bg-violet-600" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${scoutEnrich ? "left-5" : "left-0.5"}`} />
                </div>
                <div>
                  <span className="text-sm text-white">AI-обогащение</span>
                  <p className="text-xs text-white/30">Оценка потенциала, резюме и следующий шаг для каждой компании</p>
                </div>
              </label>
              <button
                onClick={runScout}
                disabled={scoutLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {scoutLoading
                  ? <><Icon name="Loader2" size={15} className="animate-spin" />Работаю...</>
                  : <><Icon name="Play" size={15} />Запустить разведку</>}
              </button>
            </div>
          </div>

          {/* Прогресс */}
          {scoutLoading && (
            <div className="glass border border-violet-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Icon name="Loader2" size={20} className="text-violet-400 animate-spin" />
                <span className="text-white font-semibold">Авто-разведка в процессе...</span>
              </div>
              <div className="space-y-3">
                {SCOUT_STEPS.map((step, i) => {
                  const isDone = currentStepIdx > i;
                  const isActive = currentStepIdx === i;
                  return (
                    <div key={step.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-violet-500/15 border border-violet-500/30" : isDone ? "bg-emerald-500/10" : "bg-white/3"}`}>
                      {isDone
                        ? <Icon name="CheckCircle" size={16} className="text-emerald-400 flex-shrink-0" />
                        : isActive
                          ? <Icon name="Loader2" size={16} className="text-violet-400 animate-spin flex-shrink-0" />
                          : <Icon name={step.icon} size={16} className="text-white/20 flex-shrink-0" />}
                      <span className={`text-sm ${isActive ? "text-white font-medium" : isDone ? "text-emerald-400" : "text-white/30"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-white/30 mt-4 text-center">Обычно занимает 30–60 секунд</p>
            </div>
          )}

          {/* Ошибка */}
          {scoutError && (
            <div className="glass border border-red-500/30 rounded-2xl p-5 flex items-center gap-3 text-red-400">
              <Icon name="AlertCircle" size={18} />
              <span className="text-sm">{scoutError}</span>
            </div>
          )}

          {/* Результат */}
          {scoutResult && !scoutLoading && (
            <div className="space-y-5">
              {/* Итоговая статистика */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Найдено", val: scoutResult.total_found, color: "text-white", bg: "bg-white/5 border-white/10" },
                  { label: "Добавлено в CRM", val: scoutResult.inserted, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                  { label: "Дублей пропущено", val: scoutResult.skipped, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                  { label: "Ошибок", val: scoutResult.errors, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                ].map((item, i) => (
                  <div key={i} className={`border rounded-2xl p-4 text-center ${item.bg}`}>
                    <div className={`text-3xl font-bold font-oswald ${item.color}`}>{item.val}</div>
                    <div className="text-xs text-white/40 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Сводка от AI */}
              {scoutResult.radar_summary && (
                <div className="glass border border-violet-500/20 rounded-2xl p-5 flex items-start gap-3">
                  <Icon name="Sparkles" size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-white/40 mb-1">{scoutRegion} · {scoutIndustry}</div>
                    <p className="text-sm text-white/80">{scoutResult.radar_summary}</p>
                  </div>
                </div>
              )}

              {/* Тренды */}
              {(scoutResult.hot_industries?.length > 0 || scoutResult.regional_trends?.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {scoutResult.hot_industries?.length > 0 && (
                    <div className="glass border border-white/10 rounded-xl p-4">
                      <div className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                        <Icon name="Flame" size={12} className="text-orange-400" />Горячие отрасли
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {scoutResult.hot_industries.map((ind, i) => (
                          <span key={i} className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded text-xs">{ind}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {scoutResult.regional_trends?.length > 0 && (
                    <div className="glass border border-white/10 rounded-xl p-4">
                      <div className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                        <Icon name="TrendingUp" size={12} className="text-cyan-400" />Тренды региона
                      </div>
                      <ul className="space-y-1">
                        {scoutResult.regional_trends.map((t, i) => (
                          <li key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                            <span className="text-cyan-400 mt-0.5 flex-shrink-0">→</span>{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Таблица компаний */}
              <div className="glass border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Icon name="Building2" size={15} className="text-violet-400" />
                    Найденные компании
                  </span>
                  <span className="text-xs text-white/30">{scoutResult.signals.length} компаний</span>
                </div>
                <div className="divide-y divide-white/5">
                  {scoutResult.signals.map((sig, i) => {
                    const isOpen = expandedSignal === i;
                    const potConf = POTENTIAL_CONFIG[sig.potential] || POTENTIAL_CONFIG["low"];
                    const isNew = i < scoutResult.inserted;
                    return (
                      <div key={i}>
                        <button
                          onClick={() => setExpandedSignal(isOpen ? null : i)}
                          className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/3 transition-colors"
                        >
                          <span className="text-xs text-white/20 flex-shrink-0 w-5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-white truncate">{sig.company_name}</span>
                              {isNew && (
                                <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex-shrink-0">новый</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-white/30">{sig.industry}</span>
                              {sig.region && <span className="text-xs text-white/20">· {sig.region}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {sig.ai_score != null && (
                              <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                                {sig.ai_score}
                              </span>
                            )}
                            <span className={`text-xs font-medium ${potConf.color} hidden sm:block`}>{potConf.label}</span>
                            <div className="flex flex-wrap gap-1 hidden lg:flex">
                              {sig.tech_tags.slice(0, 2).map(tag => (
                                <span key={tag} className={`px-1.5 py-0.5 rounded text-xs border ${TECH_TAG_COLORS[tag] || "bg-white/5 text-white/40 border-white/10"}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={14} className="text-white/30" />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-5 pb-5 pt-2 bg-white/3 space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                {/* Технологии */}
                                <div>
                                  <div className="text-xs text-white/30 mb-1.5">Технологии</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {sig.tech_tags.map(tag => (
                                      <span key={tag} className={`px-2 py-0.5 rounded text-xs border ${TECH_TAG_COLORS[tag] || "bg-white/5 text-white/40 border-white/10"}`}>{tag}</span>
                                    ))}
                                  </div>
                                </div>
                                {/* Сигнал */}
                                <div>
                                  <div className="text-xs text-white/30 mb-1">Что внедряют</div>
                                  <p className="text-xs text-white/60 leading-relaxed">{sig.signal}</p>
                                </div>
                                {sig.source && (
                                  <div className="text-xs text-white/25">Источник: {sig.source}</div>
                                )}
                                {sig.website && (
                                  <a href={sig.website.startsWith("http") ? sig.website : `https://${sig.website}`}
                                    target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
                                    <Icon name="Globe" size={11} />{sig.website}
                                  </a>
                                )}
                              </div>
                              {/* AI-обогащение */}
                              {sig.ai_summary && (
                                <div className="space-y-3">
                                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                                    <div className="text-xs text-violet-400 font-semibold mb-1 flex items-center gap-1.5">
                                      <Icon name="BrainCircuit" size={11} />AI-оценка: {sig.ai_score}/100
                                    </div>
                                    <p className="text-xs text-white/70">{sig.ai_summary}</p>
                                  </div>
                                  {sig.ai_reasons && sig.ai_reasons.length > 0 && (
                                    <div className="space-y-1">
                                      {sig.ai_reasons.map((r, ri) => (
                                        <div key={ri} className="flex items-start gap-1.5 text-xs text-white/50">
                                          <Icon name="Check" size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                          {r}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {sig.next_action && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                      <div className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                                        <Icon name="ArrowRight" size={11} />Следующий шаг
                                      </div>
                                      <p className="text-xs text-white/70">{sig.next_action}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Пустой стейт разведки */}
          {!scoutLoading && !scoutResult && !scoutError && (
            <div className="glass border border-white/10 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon name="Radar" size={32} className="text-violet-400" />
              </div>
              <h3 className="font-oswald text-lg font-bold text-white mb-2">Авто-разведка</h3>
              <p className="text-white/40 text-sm max-w-md mx-auto mb-6">
                Выберите регион и отрасль. AI найдёт 30–40 компаний, оценит каждую
                и автоматически добавит в CRM с дедубликацией
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-white/30 mb-6">
                {[
                  { icon: "Radar", text: "Радар находит компании" },
                  { icon: "BrainCircuit", text: "AI оценивает потенциал" },
                  { icon: "ShieldCheck", text: "Дедубликация по ИНН" },
                  { icon: "DatabaseZap", text: "Пакетный импорт в CRM" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Icon name={item.icon} size={13} className="text-violet-400" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ОТЧЁТ ПО CRM ===== */}
      {mainTab === "report" && (
      <>
      {/* Кнопка генерации */}
      <div className="flex justify-end">
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
        >
          {loading
            ? <><Icon name="Loader2" size={16} className="animate-spin" />Анализирую базу...</>
            : <><Icon name="Sparkles" size={16} />Сгенерировать отчёт</>}
        </button>
      </div>

      {/* Пустой стейт */}
      {!report && !loading && !error && (
        <div className="glass border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="BrainCircuit" size={32} className="text-violet-400" />
          </div>
          <h3 className="font-oswald text-lg font-bold text-white mb-2">Отчёт ещё не сгенерирован</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto mb-6">
            AI-агент прочитает всю CRM, проанализирует лиды и выдаст стратегию продвижения
            и конкретные письма/скрипты для каждого клиента
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-white/30 mb-6">
            {[
              { icon: "Database", text: "Читает все лиды из CRM" },
              { icon: "BarChart2", text: "Анализирует воронку продаж" },
              { icon: "Target", text: "Выделяет приоритеты" },
              { icon: "Mail", text: "Пишет письма и скрипты" },
            ].map((i, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Icon name={i.icon} size={13} className="text-violet-400" />
                {i.text}
              </div>
            ))}
          </div>
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all mx-auto"
          >
            <Icon name="Sparkles" size={16} />
            Запустить анализ
          </button>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="glass border border-violet-500/20 rounded-2xl p-12 text-center">
          <Icon name="Loader2" size={40} className="text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">AI-агент анализирует базу...</p>
          <p className="text-white/40 text-sm">Читаю лиды, строю стратегию, пишу рекомендации</p>
          <p className="text-white/30 text-xs mt-2">Обычно занимает 30–60 секунд</p>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="glass border border-red-500/30 rounded-2xl p-5 flex items-center gap-3 text-red-400">
          <Icon name="AlertCircle" size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Отчёт */}
      {report && s && (
        <div className="space-y-5">
          {/* Мета */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/30">
            <span className="flex items-center gap-1.5"><Icon name="Clock" size={12} />
              {new Date(report.generated_at).toLocaleString("ru")}
            </span>
            <span className="flex items-center gap-1.5"><Icon name="Users" size={12} />
              {report.total_prospects} лидов проанализировано
            </span>
            {health && (
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold ${verdictCls}`}>
                <Icon name="Activity" size={12} />
                Воронка: {health.verdict} — {health.score}/100
              </span>
            )}
          </div>

          {/* Executive summary */}
          <div className="glass border border-violet-500/20 rounded-2xl p-6">
            <p className="text-sm text-white/80 leading-relaxed">{s.executive_summary}</p>
            {health?.comment && (
              <p className="text-xs text-white/40 mt-2 pt-2 border-t border-white/5">{health.comment}</p>
            )}
          </div>

          {/* Табы */}
          <div className="flex gap-1 glass border border-white/10 rounded-xl p-1 w-fit">
            {([
              { key: "strategy", label: "Стратегия", icon: "Target" },
              { key: "leads", label: `Рекомендации по лидам (${report.leads_recommendations.length})`, icon: "Users" },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {/* СТРАТЕГИЯ */}
          {activeTab === "strategy" && (
            <div className="space-y-5">
              {/* Quick wins */}
              {s.quick_wins?.length > 0 && (
                <div className="glass border border-emerald-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="Zap" size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">Быстрые победы — сделайте сегодня</span>
                  </div>
                  <div className="space-y-2">
                    {s.quick_wins.map((w, i) => (
                      <div key={i} className="flex items-start gap-3 bg-emerald-500/5 rounded-xl px-4 py-3">
                        <span className="text-xs font-bold text-emerald-500 mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        <p className="text-sm text-white/80">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                {/* Топ возможности */}
                {s.top_opportunities?.length > 0 && (
                  <div className="glass border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="TrendingUp" size={16} className="text-cyan-400" />
                      <span className="text-sm font-semibold text-white">Топ возможности</span>
                    </div>
                    <div className="space-y-3">
                      {s.top_opportunities.map((o, i) => (
                        <div key={i} className="border border-white/5 rounded-xl p-4 bg-white/3">
                          <div className="font-semibold text-sm text-white mb-1">{o.company}</div>
                          <div className="text-xs text-white/50 mb-2">{o.reason}</div>
                          <div className="flex items-start gap-1.5 text-xs text-cyan-400">
                            <Icon name="ArrowRight" size={11} className="flex-shrink-0 mt-0.5" />
                            {o.action}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Риски */}
                {s.risks?.length > 0 && (
                  <div className="glass border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="AlertTriangle" size={16} className="text-amber-400" />
                      <span className="text-sm font-semibold text-white">Риски</span>
                    </div>
                    <div className="space-y-3">
                      {s.risks.map((r, i) => (
                        <div key={i} className="border border-amber-500/10 rounded-xl p-4 bg-amber-500/5">
                          <div className="font-semibold text-sm text-white mb-1">{r.company}</div>
                          <div className="text-xs text-amber-400/80 mb-2">{r.risk}</div>
                          <div className="flex items-start gap-1.5 text-xs text-white/50">
                            <Icon name="Shield" size={11} className="flex-shrink-0 mt-0.5" />
                            {r.mitigation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Стратегия */}
              {s.strategy && (
                <div className="glass border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Icon name="Map" size={16} className="text-violet-400" />
                    <span className="text-sm font-semibold text-white">Стратегия на 2 недели</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-white/40 mb-1">Фокус</div>
                      <p className="text-sm text-white/80">{s.strategy.focus}</p>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-1">Ключевое сообщение</div>
                      <p className="text-sm text-white/80">{s.strategy.messaging}</p>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-2">Каналы</div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.strategy.channels?.map((c, i) => (
                          <span key={i} className="px-2.5 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full border border-violet-500/30">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-1">План</div>
                      <p className="text-sm text-white/80">{s.strategy.timeline}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Сегменты */}
              {s.segments?.length > 0 && (
                <div className="glass border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="PieChart" size={16} className="text-pink-400" />
                    <span className="text-sm font-semibold text-white">Сегменты базы</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {s.segments.map((seg, i) => (
                      <div key={i} className="border border-white/5 rounded-xl p-4 bg-white/3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-white">{seg.name}</span>
                          <span className="text-xs text-white/40">{seg.count} лидов</span>
                        </div>
                        <p className="text-xs text-white/50">{seg.approach}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* РЕКОМЕНДАЦИИ ПО ЛИДАМ */}
          {activeTab === "leads" && (
            <div className="space-y-3">
              {report.leads_recommendations.length === 0 && (
                <div className="glass border border-white/10 rounded-2xl p-8 text-center text-white/40 text-sm">
                  Нет данных по лидам
                </div>
              )}
              {report.leads_recommendations.map((lead, i) => {
                const isOpen = expandedLead === i;
                const timingCls = TIMING_COLOR[lead.timing?.toLowerCase() || ""] || "text-white/40 bg-white/5";

                const SEGMENT_COLOR: Record<string, string> = {
                  "Услуги": "text-violet-300 bg-violet-500/10 border-violet-500/20",
                  "Онлайн-школа": "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
                  "E-commerce": "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
                  "B2B": "text-amber-300 bg-amber-500/10 border-amber-500/20",
                };
                const segCls = SEGMENT_COLOR[lead.segment || ""] || "text-white/40 bg-white/5 border-white/10";

                return (
                  <div key={i} className="glass border border-white/10 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedLead(isOpen ? null : i)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
                    >
                      <span className="text-xs font-bold text-white/30 flex-shrink-0 w-6">{String(i + 1).padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-white truncate">{lead.company}</span>
                          {lead.segment && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${segCls}`}>
                              {lead.segment}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/40 truncate">{lead.next_step}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lead.timing && (
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${timingCls}`}>
                            {lead.timing}
                          </span>
                        )}
                        <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/30" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-white/5 px-5 py-5 space-y-4">
                        {/* Признаки тёплого клиента */}
                        {lead.warm_signals && (
                          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
                            <div className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                              <Icon name="Flame" size={12} />Признаки хаоса / потерь
                            </div>
                            <p className="text-xs text-white/70">{lead.warm_signals}</p>
                          </div>
                        )}

                        {/* Оффер */}
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                          <div className="text-xs text-violet-400 font-semibold mb-1 flex items-center gap-1.5">
                            <Icon name="Package" size={12} />Что предложить
                          </div>
                          <p className="text-sm text-white/80">{lead.offer}</p>
                        </div>

                        {/* Письмо */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-white/40 font-semibold flex items-center gap-1.5">
                              <Icon name="Mail" size={12} />Письмо
                            </div>
                            <CopyBtn text={`Тема: ${lead.email_subject}\n\n${lead.email_body}`} />
                          </div>
                          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                            <div className="text-xs text-white/50 mb-2">Тема: <span className="text-white/80 font-medium">{lead.email_subject}</span></div>
                            <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-sans">{lead.email_body}</pre>
                          </div>
                        </div>

                        {/* Скрипт звонка */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-white/40 font-semibold flex items-center gap-1.5">
                              <Icon name="Phone" size={12} />Скрипт звонка
                            </div>
                            <CopyBtn text={lead.call_script} />
                          </div>
                          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                            <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-sans">{lead.call_script}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}