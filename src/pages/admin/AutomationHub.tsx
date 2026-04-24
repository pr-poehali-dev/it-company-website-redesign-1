import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const AUTO_EMAILER_URL = "https://functions.poehali.dev/977f553d-a834-4fba-9f2f-349939384e9e";
const FOLLOWUP_URL = "https://functions.poehali.dev/b11d9fef-38cd-4721-9bb3-4d7e7d97927f";
const RADAR_URL = "https://functions.poehali.dev/2725883d-2720-4230-8bac-e2703f726abc";

const REGIONS = [
  "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск",
  "Краснодар", "Казань", "Нижний Новгород", "Самара",
];
const INDUSTRIES = [
  "Все", "маркетинг и реклама", "медицина и клиники",
  "образование и курсы", "торговля и e-commerce", "юридические услуги",
];

type Tab = "emailer" | "followup" | "radar" | "analyze";

interface Task {
  id: string;
  prospect_id: string;
  task_type: string;
  scheduled_at: string;
  executed_at: string | null;
  status: string;
  ai_subject: string | null;
  error_msg: string | null;
  created_at: string;
  company_name: string | null;
  email: string | null;
  prospect_status: string | null;
}

interface RadarRun {
  id: string;
  region: string;
  industry: string;
  found: number;
  inserted: number;
  skipped: number;
  trigger_type: string;
  started_at: string;
  finished_at: string | null;
  error_msg: string | null;
}

const TASK_STATUS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  sent: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
  skipped: "bg-white/10 text-white/40 border-white/10",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  sent: "Отправлено",
  failed: "Ошибка",
  skipped: "Пропущено",
};

function StatusBadge({ status, map, labelMap }: { status: string; map: Record<string, string>; labelMap: Record<string, string> }) {
  const cls = map[status] ?? "bg-white/10 text-white/40 border-white/10";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

function ResultOk({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm">
      <Icon name="CheckCircle" size={15} />
      {children}
    </div>
  );
}

function ResultErr({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm">
      <Icon name="XCircle" size={15} />
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon name={icon as "Mail"} size={16} className="text-violet-400" />
      <span className="font-oswald font-bold text-white text-sm">{children}</span>
    </div>
  );
}

function ActionBtn({
  onClick, loading, disabled, icon, children, variant = "primary",
}: {
  onClick: () => void; loading: boolean; disabled?: boolean;
  icon: string; children: React.ReactNode; variant?: "primary" | "ghost";
}) {
  const base = "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const cls = variant === "primary"
    ? `${base} bg-violet-600 hover:bg-violet-500 text-white`
    : `${base} glass border border-white/10 hover:border-white/30 text-white/70 hover:text-white`;
  return (
    <button onClick={onClick} disabled={loading || disabled} className={cls}>
      {loading
        ? <><Icon name="Loader2" size={14} className="animate-spin" />Работаю...</>
        : <><Icon name={icon as "Mail"} size={14} />{children}</>}
    </button>
  );
}

function InfoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white/50 leading-relaxed mb-5">
      {children}
    </div>
  );
}

function TabEmailer() {
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ sent: number; errors: unknown[] } | null>(null);
  const [batchError, setBatchError] = useState("");

  const [singleId, setSingleId] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<{ ok: boolean; subject?: string; sent_to?: string; error?: string } | null>(null);

  async function runBatch() {
    setBatchLoading(true);
    setBatchError("");
    setBatchResult(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch_send" }),
      });
      const data = await res.json();
      if (data.ok) setBatchResult({ sent: data.sent, errors: data.errors ?? [] });
      else setBatchError(data.error ?? "Неизвестная ошибка");
    } catch {
      setBatchError("Ошибка соединения");
    } finally {
      setBatchLoading(false);
    }
  }

  async function runSingle() {
    const id = parseInt(singleId);
    if (!id) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_intro", prospect_id: id }),
      });
      const data = await res.json();
      setSingleResult(data);
    } catch {
      setSingleResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setSingleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="Send">Пакетная рассылка</SectionTitle>
        <InfoBlock>
          Отправляет персональное письмо каждому новому лиду с email. Письмо генерируется AI
          на основе отрасли и сайта компании. Обрабатывает до 20 лидов за раз.
        </InfoBlock>
        <div className="flex flex-wrap items-center gap-3">
          <ActionBtn onClick={runBatch} loading={batchLoading} icon="Send">
            Запустить пакетную рассылку
          </ActionBtn>
          {batchResult && (
            <ResultOk>
              Отправлено: <strong>{batchResult.sent}</strong> писем
              {batchResult.errors.length > 0 && (
                <span className="text-yellow-300 ml-2">| Ошибок: {batchResult.errors.length}</span>
              )}
            </ResultOk>
          )}
          {batchError && <ResultErr>{batchError}</ResultErr>}
        </div>
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="Mail">Отправить конкретному лиду</SectionTitle>
        <InfoBlock>
          Введите ID лида из CRM для отправки персонализированного вводного письма.
        </InfoBlock>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            value={singleId}
            onChange={e => setSingleId(e.target.value)}
            placeholder="ID лида"
            className="w-36 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
          />
          <ActionBtn onClick={runSingle} loading={singleLoading} disabled={!singleId} icon="Mail">
            Отправить
          </ActionBtn>
        </div>
        {singleResult && (
          <div className="mt-4">
            {singleResult.ok ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <Icon name="CheckCircle" size={14} />
                  Письмо отправлено
                </div>
                {singleResult.sent_to && (
                  <div className="text-xs text-white/50">
                    Получатель: <span className="text-white/80">{singleResult.sent_to}</span>
                  </div>
                )}
                {singleResult.subject && (
                  <div className="text-xs text-white/50">
                    Тема: <span className="text-white/80">{singleResult.subject}</span>
                  </div>
                )}
              </div>
            ) : (
              <ResultErr>{singleResult.error ?? "Ошибка отправки"}</ResultErr>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabFollowup() {
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<{ scheduled: number } | null>(null);
  const [scheduleError, setScheduleError] = useState("");

  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<{ processed: number; sent: number; errors: unknown[] } | null>(null);
  const [runError, setRunError] = useState("");

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

  async function schedule() {
    setScheduleLoading(true);
    setScheduleError("");
    setScheduleResult(null);
    try {
      const res = await fetch(FOLLOWUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule_followups" }),
      });
      const data = await res.json();
      if (data.ok) setScheduleResult({ scheduled: data.scheduled });
      else setScheduleError(data.error ?? "Ошибка");
    } catch {
      setScheduleError("Ошибка соединения");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function runNow() {
    setRunLoading(true);
    setRunError("");
    setRunResult(null);
    try {
      const res = await fetch(FOLLOWUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_followups" }),
      });
      const data = await res.json();
      if (data.ok) { setRunResult({ processed: data.processed, sent: data.sent, errors: data.errors ?? [] }); loadTasks(); }
      else setRunError(data.error ?? "Ошибка");
    } catch {
      setRunError("Ошибка соединения");
    } finally {
      setRunLoading(false);
    }
  }

  function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="RefreshCw">Управление follow-up</SectionTitle>
        <InfoBlock>
          Автоматические повторные касания с лидами, у которых нет активности более 3 дней.
          Письма генерируются AI с новым углом подачи — не повтор первого письма.
        </InfoBlock>
        <div className="flex flex-wrap gap-3">
          <ActionBtn onClick={schedule} loading={scheduleLoading} icon="CalendarPlus" variant="ghost">
            Запланировать follow-up
          </ActionBtn>
          <ActionBtn onClick={runNow} loading={runLoading} icon="Play">
            Запустить обработку
          </ActionBtn>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {scheduleResult && <ResultOk>Создано задач: <strong>{scheduleResult.scheduled}</strong></ResultOk>}
          {scheduleError && <ResultErr>{scheduleError}</ResultErr>}
          {runResult && (
            <ResultOk>
              Обработано: <strong>{runResult.processed}</strong>, отправлено: <strong>{runResult.sent}</strong>
              {runResult.errors.length > 0 && <span className="text-yellow-300 ml-2">| Ошибок: {runResult.errors.length}</span>}
            </ResultOk>
          )}
          {runError && <ResultErr>{runError}</ResultErr>}
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

function TabRadar() {
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledResult, setScheduledResult] = useState<{ ok: boolean; region?: string; industry?: string; found?: number; inserted?: number; skipped?: number; error?: string } | null>(null);

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

  async function runScheduled() {
    setScheduledLoading(true);
    setScheduledResult(null);
    try {
      const res = await fetch(RADAR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_scheduled" }),
      });
      const data = await res.json();
      setScheduledResult(data);
      if (data.ok) loadHistory();
    } catch {
      setScheduledResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setScheduledLoading(false);
    }
  }

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

  function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
          Ротация регионов и отраслей по дням. Каждый запуск AI ищет 20–30 новых компаний
          и добавляет их в CRM после дедупликации по ИНН и названию.
        </InfoBlock>
        <div className="flex flex-wrap gap-3 mb-4">
          <ActionBtn onClick={runScheduled} loading={scheduledLoading} icon="Clock">
            Ночной запуск (авто)
          </ActionBtn>
          <ActionBtn onClick={runHh} loading={hhLoading} icon="Briefcase" variant="ghost">
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
          {scheduledResult && (
            scheduledResult.ok
              ? <ResultOk>Найдено: <strong>{scheduledResult.found}</strong> · Добавлено: <strong>{scheduledResult.inserted}</strong> · Пропущено: {scheduledResult.skipped}</ResultOk>
              : <ResultErr>{scheduledResult.error}</ResultErr>
          )}
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

function TabAnalyze() {
  const [analyzeId, setAnalyzeId] = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{ ok: boolean; site_analysis?: string; site_pain_points?: string; error?: string } | null>(null);

  async function runAnalyze() {
    const id = parseInt(analyzeId);
    if (!id) return;
    setAnalyzeLoading(true);
    setAnalyzeResult(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_site", prospect_id: id }),
      });
      const data = await res.json();
      setAnalyzeResult(data);
    } catch {
      setAnalyzeResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setAnalyzeLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="Globe">Анализ сайта клиента</SectionTitle>
        <InfoBlock>
          AI анализирует сайт компании и извлекает боли: что продают, признаки хаоса
          в обработке заявок. Используется для генерации персональных писем.
          Результат сохраняется в карточку лида в CRM.
        </InfoBlock>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            value={analyzeId}
            onChange={e => setAnalyzeId(e.target.value)}
            placeholder="ID лида"
            className="w-36 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
            onKeyDown={e => e.key === "Enter" && runAnalyze()}
          />
          <ActionBtn onClick={runAnalyze} loading={analyzeLoading} disabled={!analyzeId} icon="Search">
            Анализировать сайт
          </ActionBtn>
        </div>
      </div>

      {analyzeResult && (
        analyzeResult.ok ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass border border-blue-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="FileSearch" size={14} className="text-blue-400" />
                <span className="text-sm font-semibold text-white">Анализ сайта</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                {analyzeResult.site_analysis || "Нет данных"}
              </p>
            </div>
            <div className="glass border border-orange-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="AlertTriangle" size={14} className="text-orange-400" />
                <span className="text-sm font-semibold text-white">Выявленные боли</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                {analyzeResult.site_pain_points || "Нет данных"}
              </p>
            </div>
          </div>
        ) : (
          <ResultErr>{analyzeResult.error ?? "Ошибка анализа"}</ResultErr>
        )
      )}
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "emailer", label: "Авто-рассылка", icon: "Mail" },
  { key: "followup", label: "Follow-up", icon: "RefreshCw" },
  { key: "radar", label: "Радар", icon: "Radar" },
  { key: "analyze", label: "Анализ сайтов", icon: "Globe" },
];

export default function AutomationHub({ token: _token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("emailer");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-oswald font-bold text-xl text-white flex items-center gap-2">
            <Icon name="Zap" size={22} className="text-violet-400" />
            Центр автоматизации
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Управление автоматическими функциями агента продаж
          </p>
        </div>
      </div>

      <div className="flex gap-1 glass border border-white/10 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-violet-600 text-white"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon name={t.icon as "Mail"} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "emailer" && <TabEmailer />}
      {activeTab === "followup" && <TabFollowup />}
      {activeTab === "radar" && <TabRadar />}
      {activeTab === "analyze" && <TabAnalyze />}
    </div>
  );
}
