import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  FOLLOWUP_URL, ActionBtn, InfoBlock, ResultErr, ResultOk, SectionTitle,
  StatusBadge, TASK_STATUS, TASK_STATUS_LABEL, fmtDate, Task,
} from "./automation-ui";

export default function TabFollowup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ scheduled: number; processed: number; sent: number; errors: unknown[] } | null>(null);
  const [error, setError] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch(FOLLOWUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_tasks" }),
      });
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function runFollowup() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r1 = await fetch(FOLLOWUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule_followups" }),
      });
      const d1 = await r1.json();
      const r2 = await fetch(FOLLOWUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_followups" }),
      });
      const d2 = await r2.json();
      if (d2.ok) {
        setResult({ scheduled: d1.scheduled ?? 0, processed: d2.processed ?? 0, sent: d2.sent ?? 0, errors: d2.errors ?? [] });
        loadTasks();
      } else {
        setError(d2.error ?? "Ошибка");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="RefreshCw">Follow-up рассылка</SectionTitle>
        <InfoBlock>
          Автоматические повторные касания с лидами, у которых нет активности более 3 дней.
          Письма генерируются AI с новым углом подачи — не повтор первого письма.
        </InfoBlock>
        <div className="flex flex-wrap gap-3">
          <ActionBtn onClick={runFollowup} loading={loading} icon="Play">
            Запустить follow-up
          </ActionBtn>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {result && (
            <ResultOk>
              Запланировано: <strong>{result.scheduled}</strong> · отправлено: <strong>{result.sent}</strong>
              {result.errors.length > 0 && <span className="text-yellow-300 ml-2">| Ошибок: {result.errors.length}</span>}
            </ResultOk>
          )}
          {error && <ResultErr>{error}</ResultErr>}
        </div>
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon="ListChecks">Список задач</SectionTitle>
          <button
            onClick={loadTasks}
            disabled={tasksLoading}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
          >
            <Icon name="RefreshCw" size={12} className={tasksLoading ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>
        {tasksLoading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-4">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Загрузка...
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-white/30 text-sm py-4 text-center">Задач нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/30">
                  <th className="text-left pb-2 pr-3 font-medium">Компания</th>
                  <th className="text-left pb-2 pr-3 font-medium">Email</th>
                  <th className="text-left pb-2 pr-3 font-medium">Статус</th>
                  <th className="text-left pb-2 pr-3 font-medium">Запланировано</th>
                  <th className="text-left pb-2 font-medium">Тема письма</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 20).map(t => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2 pr-3 text-white/80 font-medium max-w-[140px] truncate">{t.company_name ?? `#${t.prospect_id}`}</td>
                    <td className="py-2 pr-3 text-white/40 max-w-[140px] truncate">{t.email ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={t.status} map={TASK_STATUS} labelMap={TASK_STATUS_LABEL} />
                    </td>
                    <td className="py-2 pr-3 text-white/40 whitespace-nowrap">{fmtDate(t.scheduled_at)}</td>
                    <td className="py-2 text-white/50 max-w-[200px] truncate">{t.ai_subject ?? (t.error_msg ? <span className="text-red-400">{t.error_msg}</span> : "—")}</td>
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
