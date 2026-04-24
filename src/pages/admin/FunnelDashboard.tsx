import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const FUNNEL_URL = "https://functions.poehali.dev/b65235c5-530f-4505-bbf6-8ae0ccae3a3c";

interface FunnelData {
  funnel: {
    lead_added: number;
    email_sent: number;
    interested: number;
    negotiation: number;
    won: number;
    lost: number;
  };
  conversion: {
    lead_to_contact: string;
    contact_to_interest: string;
    interest_to_won: string;
  };
  by_source: Array<{ source: string; leads: number; won: number; conversion: string }>;
  by_industry: Array<{ industry: string; leads: number; avg_score: number; won: number }>;
  by_region: Array<{ region: string; leads: number; won: number }>;
  radar_stats: { total_runs: number; total_found: number; total_inserted: number; last_run: string };
  followup_stats: { total_sent: number; pending: number };
  top_prospects: Array<{ company_name: string; status: string; ai_score: number; industry: string }>;
  weekly_trend: Array<{ date: string; added: number; emails_sent: number }>;
}

const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  contacted: "Контакт",
  interested: "Интерес",
  negotiation: "Переговоры",
  won: "Клиент",
  lost: "Отказ",
  postponed: "Отложен",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  contacted: "bg-violet-500/20 text-violet-300",
  interested: "bg-yellow-500/20 text-yellow-300",
  negotiation: "bg-orange-500/20 text-orange-300",
  won: "bg-emerald-500/20 text-emerald-300",
  lost: "bg-red-500/20 text-red-300",
  postponed: "bg-white/10 text-white/40",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/5 ${className ?? ""}`} />;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span
        className={`text-xs font-bold ${score >= 70 ? "text-emerald-400" : score >= 40 ? "text-yellow-400" : "text-red-400"}`}
      >
        {score}
      </span>
    </div>
  );
}

export default function FunnelDashboard({ token }: { token: string }) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportText, setReportText] = useState("");
  const [showReport, setShowReport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(FUNNEL_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FunnelData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function fetchWeeklyReport() {
    setReportLoading(true);
    try {
      const res = await fetch(FUNNEL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_weekly_report" }),
      });
      const json = await res.json();
      setReportText(json.report_text || "Отчёт пуст");
      setShowReport(true);
    } catch {
      setReportText("Ошибка получения отчёта");
      setShowReport(true);
    } finally {
      setReportLoading(false);
    }
  }

  const f = data?.funnel;
  const conv = data?.conversion;

  const funnelSteps = [
    { label: "Найдено", value: f?.lead_added ?? 0, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500", conv: null },
    { label: "Написано", value: f?.email_sent ?? 0, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", dot: "bg-violet-500", conv: conv?.lead_to_contact },
    { label: "Интерес", value: f?.interested ?? 0, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", dot: "bg-yellow-500", conv: conv?.contact_to_interest },
    { label: "Переговоры", value: f?.negotiation ?? 0, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", dot: "bg-orange-500", conv: null },
    { label: "Клиенты", value: f?.won ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-500", conv: conv?.interest_to_won },
  ];

  const maxIndustryLeads = Math.max(...(data?.by_industry?.map((i) => i.leads) ?? [1]));
  const maxWeeklyAdded = Math.max(...(data?.weekly_trend?.map((d) => d.added) ?? [1]), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-oswald font-bold text-xl text-white flex items-center gap-2">
            <Icon name="BarChart2" size={22} className="text-violet-400" />
            Воронка продаж
          </h2>
          <p className="text-white/40 text-xs mt-0.5">Метрики агента, конверсии и ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWeeklyReport}
            disabled={reportLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-violet-500/30 hover:border-violet-400/60 text-violet-300 hover:text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            {reportLoading
              ? <><Icon name="Loader2" size={14} className="animate-spin" />Генерирую...</>
              : <><Icon name="FileText" size={14} />Недельный отчёт</>}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            <Icon name="RefreshCw" size={14} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-400">
          <Icon name="AlertCircle" size={18} />
          <span className="text-sm">{error}</span>
          <button onClick={load} className="ml-auto text-xs underline underline-offset-2 hover:text-red-300 transition-colors">
            Повторить
          </button>
        </div>
      )}

      {/* ── Секция 1: Воронка ── */}
      <div className="grid grid-cols-5 gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : funnelSteps.map((step, i) => (
              <div key={i} className="relative">
                <div className={`glass border rounded-2xl p-4 ${step.bg}`}>
                  {step.conv && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 bg-[#080812] px-1.5 border border-white/10 rounded-full whitespace-nowrap">
                      {step.conv}
                    </div>
                  )}
                  <div className={`text-3xl font-bold font-oswald ${step.color} leading-none mb-1`}>
                    {step.value.toLocaleString("ru")}
                  </div>
                  <div className="text-xs text-white/50">{step.label}</div>
                  <div className={`mt-2 w-5 h-1 rounded-full ${step.dot}`} />
                </div>
                {i < funnelSteps.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 text-white/20">
                    <Icon name="ChevronRight" size={14} />
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* ── Секция 2: Метрики агента ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <div className="glass border border-white/10 rounded-2xl p-4">
              <Icon name="Radar" size={18} className="text-cyan-400 mb-2" />
              <div className="text-2xl font-bold font-oswald text-white">{data?.radar_stats.total_runs ?? 0}</div>
              <div className="text-xs text-white/40 mt-0.5">Запусков радара</div>
            </div>
            <div className="glass border border-white/10 rounded-2xl p-4">
              <Icon name="Users" size={18} className="text-violet-400 mb-2" />
              <div className="text-2xl font-bold font-oswald text-white">{data?.radar_stats.total_inserted ?? 0}</div>
              <div className="text-xs text-white/40 mt-0.5">Лидов через радар</div>
              {(data?.radar_stats.total_found ?? 0) > 0 && (
                <div className="text-[10px] text-white/25 mt-0.5">
                  найдено {data?.radar_stats.total_found}
                </div>
              )}
            </div>
            <div className="glass border border-white/10 rounded-2xl p-4">
              <Icon name="Send" size={18} className="text-blue-400 mb-2" />
              <div className="text-2xl font-bold font-oswald text-white">{data?.followup_stats.total_sent ?? 0}</div>
              <div className="text-xs text-white/40 mt-0.5">Follow-up отправлено</div>
            </div>
            <div className="glass border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon name="Clock" size={18} className="text-yellow-400" />
                {(data?.followup_stats.pending ?? 0) > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-oswald text-white">{data?.followup_stats.pending ?? 0}</div>
              <div className="text-xs text-white/40 mt-0.5">Follow-up в очереди</div>
            </div>
          </>
        )}
      </div>

      {/* ── Секция 3: три колонки ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* By source */}
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-oswald font-bold text-white text-sm mb-4 flex items-center gap-2">
            <Icon name="Database" size={14} className="text-cyan-400" />
            По источникам
          </h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
          ) : (data?.by_source?.length ?? 0) === 0 ? (
            <p className="text-white/30 text-xs">Нет данных</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-4 text-[10px] text-white/30 pb-1 border-b border-white/5">
                <span className="col-span-2">Источник</span>
                <span className="text-right">Лидов</span>
                <span className="text-right">Конв.</span>
              </div>
              {data!.by_source.map((s, i) => (
                <div key={i} className="grid grid-cols-4 items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="col-span-2 text-xs text-white/70 truncate pr-2">{s.source}</span>
                  <span className="text-right text-xs font-semibold text-white">{s.leads}</span>
                  <span className="text-right text-xs text-emerald-400 font-medium">{s.conversion}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By industry */}
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-oswald font-bold text-white text-sm mb-4 flex items-center gap-2">
            <Icon name="Layers" size={14} className="text-violet-400" />
            По отраслям
          </h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (data?.by_industry?.length ?? 0) === 0 ? (
            <p className="text-white/30 text-xs">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {data!.by_industry.slice(0, 5).map((ind, i) => {
                const pct = maxIndustryLeads > 0 ? Math.round((ind.leads / maxIndustryLeads) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/70 truncate flex-1 pr-2">{ind.industry}</span>
                      <span className="text-xs font-bold text-white flex-shrink-0">{ind.leads}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500/70 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {ind.won > 0 && (
                      <div className="text-[10px] text-emerald-400/60 mt-0.5">{ind.won} клиент{ind.won > 1 ? "а" : ""}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top prospects */}
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-oswald font-bold text-white text-sm mb-4 flex items-center gap-2">
            <Icon name="Trophy" size={14} className="text-yellow-400" />
            Топ лидов по скору
          </h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (data?.top_prospects?.length ?? 0) === 0 ? (
            <p className="text-white/30 text-xs">Нет данных</p>
          ) : (
            <div className="space-y-2">
              {data!.top_prospects.map((p, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-white/30 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{p.company_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? "bg-white/10 text-white/40"}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      <span className="text-[10px] text-white/30 truncate">{p.industry}</span>
                    </div>
                  </div>
                  <ScoreBar score={p.ai_score} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Секция 4: Weekly trend ── */}
      <div className="glass border border-white/10 rounded-2xl p-5">
        <h3 className="font-oswald font-bold text-white text-sm mb-5 flex items-center gap-2">
          <Icon name="TrendingUp" size={14} className="text-violet-400" />
          Активность за 7 дней
        </h3>
        {loading ? (
          <div className="flex items-end gap-3 h-20">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${30 + i * 8}px` } as React.CSSProperties} />
            ))}
          </div>
        ) : (data?.weekly_trend?.length ?? 0) === 0 ? (
          <div className="text-center py-8 text-white/30">
            <Icon name="BarChart2" size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">Нет событий за последние 7 дней</p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {data!.weekly_trend.map((day, i) => {
              const barH = maxWeeklyAdded > 0 ? Math.max(Math.round((day.added / maxWeeklyAdded) * 60), day.added > 0 ? 4 : 2) : 2;
              const date = new Date(day.date);
              const label = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    +{day.added} / {day.emails_sent}✉
                  </div>
                  <div className="w-full relative flex flex-col items-center justify-end" style={{ height: "64px" }}>
                    {day.emails_sent > 0 && (
                      <div
                        className="w-full rounded-t bg-blue-500/30 absolute bottom-0"
                        style={{ height: `${Math.max(Math.round((day.emails_sent / maxWeeklyAdded) * 60), 2)}px` }}
                      />
                    )}
                    <div
                      className="w-full rounded-t bg-violet-500 absolute bottom-0 opacity-80 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${barH}px` }}
                    />
                  </div>
                  <div className="text-[10px] text-white/30">{label}</div>
                  {day.added > 0 && (
                    <div className="text-[10px] font-bold text-violet-300">+{day.added}</div>
                  )}
                </div>
              );
            })}
            <div className="flex flex-col gap-1 ml-2 pb-6">
              <div className="flex items-center gap-1 text-[10px] text-white/30">
                <span className="w-2 h-2 rounded bg-violet-500 inline-block" />
                лидов
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/30">
                <span className="w-2 h-2 rounded bg-blue-500/50 inline-block" />
                писем
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Модалка недельного отчёта ── */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowReport(false)}
          />
          <div className="relative glass border border-violet-500/30 rounded-2xl p-6 max-w-xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-oswald text-lg font-bold text-white flex items-center gap-2">
                <Icon name="FileText" size={18} className="text-violet-400" />
                Недельный отчёт
              </h3>
              <button
                onClick={() => setShowReport(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1">
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{reportText}</p>
            </div>
            <div className="flex justify-end mt-4 flex-shrink-0">
              <button
                onClick={() => setShowReport(false)}
                className="px-5 py-2 rounded-xl glass border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-sm font-medium transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
