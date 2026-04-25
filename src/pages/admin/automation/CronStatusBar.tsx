import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { CRON_URL, CHECK_INTERVAL_MS, fmtAgo } from "./automation-ui";

export default function CronStatusBar() {
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [isDue, setIsDue] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ emails_sent?: number; radar_inserted?: number; followups_sent?: number } | null>(null);

  const runCycle = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      const r = await fetch(CRON_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const rd = await r.json();
      setLastRun(rd.started_at ?? new Date().toISOString());
      setLastResult(rd);
      setIsDue(false);
    } finally {
      setRunning(false);
    }
  }, [running]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(CRON_URL, { method: "GET" });
      const data = await res.json();
      setLastRun(data.last_run ?? null);
      setIsDue(data.is_due ?? false);
      setLastResult(data.last_result ?? null);
      if (data.is_due && !running) runCycle();
    } catch {
      // silent
    }
  }, [running, runCycle]);

  useEffect(() => {
    checkStatus();
    const timer = setInterval(checkStatus, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkStatus]);

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs transition-all ${
      running
        ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
        : isDue
        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
    }`}>
      {running ? (
        <Icon name="Loader2" size={13} className="animate-spin flex-shrink-0" />
      ) : isDue ? (
        <Icon name="Clock" size={13} className="flex-shrink-0" />
      ) : (
        <Icon name="CheckCircle" size={13} className="flex-shrink-0" />
      )}
      <span>
        {running
          ? "Агент работает: радар → письма → follow-up..."
          : isDue
          ? "Готов к запуску — нажми ▶"
          : `Последний запуск: ${fmtAgo(lastRun)}`}
      </span>
      {!running && lastResult && (
        <span className="ml-auto text-white/30 flex gap-3">
          {lastResult.radar_inserted !== undefined && <span>+{lastResult.radar_inserted} лидов</span>}
          {lastResult.emails_sent !== undefined && <span>{lastResult.emails_sent} писем</span>}
          {lastResult.followups_sent !== undefined && <span>{lastResult.followups_sent} follow-up</span>}
        </span>
      )}
      {!running && (
        <button
          onClick={runCycle}
          title="Запустить полный цикл сейчас"
          className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
        >
          <Icon name="Play" size={12} />
        </button>
      )}
    </div>
  );
}
