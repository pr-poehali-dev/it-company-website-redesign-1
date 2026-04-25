import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  RADAR_URL, REGIONS, INDUSTRIES, ActionBtn, InfoBlock, ResultErr, ResultOk,
  SectionTitle, RadarRun, fmtDate,
} from "./automation-ui";

export default function TabRadar() {
  const [hhLoading, setHhLoading] = useState(false);
  const [hhResult, setHhResult] = useState<{ ok: boolean; vacancies_found?: number; leads_added?: number; query?: string; error?: string } | null>(null);

  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState<{ ok: boolean; found?: number; inserted?: number; skipped?: number; error?: string } | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualRegion, setManualRegion] = useState("Москва");
  const [manualIndustry, setManualIndustry] = useState("Все");

  const [history, setHistory] = useState<RadarRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(RADAR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_history" }),
      });
      const data = await res.json();
      setHistory(data.runs ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function runHh() {
    setHhLoading(true);
    setHhResult(null);
    try {
      const res = await fetch(RADAR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_hh_signals" }),
      });
      const data = await res.json();
      setHhResult(data);
      if (data.ok) loadHistory();
    } catch {
      setHhResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setHhLoading(false);
    }
  }

  async function runManual() {
    setManualLoading(true);
    setManualResult(null);
    try {
      const res = await fetch(RADAR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_manual",
          region: manualRegion,
          industry: manualIndustry === "Все" ? "" : manualIndustry,
        }),
      });
      const data = await res.json();
      setManualResult(data);
      if (data.ok) loadHistory();
    } catch {
      setManualResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setManualLoading(false);
    }
  }

  const TRIGGER_LABEL: Record<string, string> = { scheduled: "Авто", manual: "Ручной", hh: "hh.ru" };
  const TRIGGER_COLOR: Record<string, string> = {
    scheduled: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    manual: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    hh: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="Radar">Запуск радара</SectionTitle>
        <InfoBlock>
          Каждый запуск AI ищет 20–30 новых компаний по регионам и отраслям, добавляет в CRM с дедупликацией.
          Ночной авто-запуск происходит через статус-бар выше — здесь ручной контроль.
        </InfoBlock>
        <div className="flex flex-wrap gap-3 mb-4">
          <ActionBtn onClick={runHh} loading={hhLoading} icon="Briefcase">
            Сигналы hh.ru
          </ActionBtn>
          <button
            onClick={() => setShowManualForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 hover:border-white/30 text-white/70 hover:text-white text-sm font-semibold transition-all"
          >
            <Icon name="SlidersHorizontal" size={14} />
            Ручной запуск
            <Icon name={showManualForm ? "ChevronUp" : "ChevronDown"} size={12} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {hhResult && (
            hhResult.ok
              ? <ResultOk>Вакансий: <strong>{hhResult.vacancies_found}</strong> · Лидов добавлено: <strong>{hhResult.leads_added}</strong></ResultOk>
              : <ResultErr>{hhResult.error}</ResultErr>
          )}
          {manualResult && (
            manualResult.ok
              ? <ResultOk>Найдено: <strong>{manualResult.found}</strong> · Добавлено: <strong>{manualResult.inserted}</strong> · Пропущено: {manualResult.skipped}</ResultOk>
              : <ResultErr>{manualResult.error}</ResultErr>
          )}
        </div>

        {showManualForm && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Регион</label>
                <select
                  value={manualRegion}
                  onChange={e => setManualRegion(e.target.value)}
                  disabled={manualLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {REGIONS.map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Отрасль</label>
                <select
                  value={manualIndustry}
                  onChange={e => setManualIndustry(e.target.value)}
                  disabled={manualLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {INDUSTRIES.map(i => <option key={i} value={i} className="bg-gray-900">{i}</option>)}
                </select>
              </div>
            </div>
            <ActionBtn onClick={runManual} loading={manualLoading} icon="Play">
              Запустить
            </ActionBtn>
          </div>
        )}
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon="History">История запусков</SectionTitle>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
          >
            <Icon name="RefreshCw" size={12} className={historyLoading ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>
        {historyLoading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-4">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Загрузка...
          </div>
        ) : history.length === 0 ? (
          <p className="text-white/30 text-sm py-4 text-center">История пуста</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/30">
                  <th className="text-left pb-2 pr-3 font-medium">Регион</th>
                  <th className="text-left pb-2 pr-3 font-medium">Отрасль</th>
                  <th className="text-right pb-2 pr-3 font-medium">Найдено</th>
                  <th className="text-right pb-2 pr-3 font-medium">Добавлено</th>
                  <th className="text-left pb-2 pr-3 font-medium">Тип</th>
                  <th className="text-left pb-2 font-medium">Время</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2 pr-3 text-white/80 font-medium">{r.region || "—"}</td>
                    <td className="py-2 pr-3 text-white/50 max-w-[140px] truncate">{r.industry || "—"}</td>
                    <td className="py-2 pr-3 text-right text-white/70">{r.found}</td>
                    <td className="py-2 pr-3 text-right text-emerald-400 font-semibold">{r.inserted}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${TRIGGER_COLOR[r.trigger_type] ?? "bg-white/10 text-white/40 border-white/10"}`}>
                        {TRIGGER_LABEL[r.trigger_type] ?? r.trigger_type}
                      </span>
                    </td>
                    <td className="py-2 text-white/40 whitespace-nowrap">{fmtDate(r.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
