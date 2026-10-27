import { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import PipesLogin from "@/components/pipes/PipesLogin";
import SourceWizard from "@/components/pipes/SourceWizard";
import RunHistory from "@/components/pipes/RunHistory";
import PipesLeadForm from "@/components/pipes/PipesLeadForm";
import { KIND } from "@/components/pipes/kinds";
import { SCHEDULE_LABEL, ago, api, getToken, num, setToken, type Plan, type Source, type User } from "@/components/pipes/pipesApi";

const STATUS = {
  ok: ["Работает", "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", "CheckCircle2"],
  error: ["Ошибка", "text-rose-300 bg-rose-500/10 border-rose-500/30", "XCircle"],
  running: ["Загружается", "text-cyan-300 bg-cyan-500/10 border-cyan-500/30", "Loader2"],
  new: ["Не загружался", "text-white/60 bg-white/5 border-white/10", "Clock"],
} as const;

export default function PipesApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [err, setErr] = useState("");
  const [wizard, setWizard] = useState<Source | "new" | null>(null);
  const [history, setHistory] = useState<Source | null>(null);
  const [running, setRunning] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState("");
  const [upgrade, setUpgrade] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ user: User; limits: Plan; sources: Source[] }>("list", {}, "GET");
    if (r.error) { setErr(r.error); return; }
    setErr(""); setUser(r.user); setPlan(r.limits); setSources(r.sources);
  }, []);

  useEffect(() => {
    const ok = !!getToken();
    setAuthed(ok); setReady(true);
    if (ok) load();
    const out = () => { setAuthed(false); setSources(null); };
    window.addEventListener("pipes-logout", out);
    return () => window.removeEventListener("pipes-logout", out);
  }, [load]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 5000); return () => clearTimeout(t); } }, [toast]);

  const run = async (s: Source) => {
    setRunning(x => ({ ...x, [s.id]: true }));
    setSources(list => list?.map(x => (x.id === s.id ? { ...x, status: "running" } : x)) || null);
    const r = await api<{ ok: boolean; error?: string; stats?: { rows_out: number; dupes: number } }>("run", { id: s.id });
    setRunning(x => ({ ...x, [s.id]: false }));
    setToast(r.ok ? `«${s.name}»: загружено ${num(r.stats?.rows_out)} строк${r.stats?.dupes ? `, удалено дублей: ${num(r.stats.dupes)}` : ""}` : `«${s.name}»: ${r.error}`);
    load();
  };

  const remove = async (s: Source) => {
    if (!confirm(`Отключить источник «${s.name}»? Загруженные данные и ссылки на них будут удалены.`)) return;
    await api("delete", { id: s.id });
    load();
  };

  const copy = (t: string) => { navigator.clipboard?.writeText(t); setToast("Ссылка скопирована"); };

  const shell = (children: React.ReactNode) => (
    <BizShell title="Кабинет — Конвейер данных | МАТ-Лабс" description="Подключение источников данных и автоматическая загрузка." path="/analytics/pipes/app" noindex
      crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Конвейер данных", href: "/analytics/pipes" }, { label: "Кабинет" }]}>{children}</BizShell>
  );

  if (!ready) return shell(<div className="h-64 rounded-2xl bg-white/5 animate-pulse" />);
  if (!authed) return shell(<PipesLogin onDone={() => { setAuthed(true); load(); }} />);

  const okCount = sources?.filter(s => s.status === "ok").length || 0;
  const errCount = sources?.filter(s => s.status === "error").length || 0;
  const rows = sources?.reduce((a, s) => a + (s.last_rows || 0), 0) || 0;

  return shell(
    <>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-violet-300 mb-1 flex items-center gap-1.5"><Icon name="Workflow" size={15} />Конвейер данных</div>
          <h1 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold">Мои источники</h1>
          {user && <div className="text-sm text-white/50 mt-1">{user.email} · тариф «{plan?.title}» · {sources?.length || 0} из {plan?.sources} источников · до {num(plan?.rows)} строк в каждом</div>}
        </div>
        <div className="flex gap-2">
          {user?.plan === "free" && <button onClick={() => setUpgrade(true)} className="px-4 py-2.5 rounded-xl border border-amber-400/40 text-amber-200 text-sm hover:bg-amber-500/10 flex items-center gap-1.5"><Icon name="Zap" size={15} />Тариф «Бизнес»</button>}
          <button onClick={() => setWizard("new")} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-semibold text-sm text-white flex items-center gap-1.5 shadow-lg shadow-violet-600/30"><Icon name="Plus" size={16} />Подключить источник</button>
          <button onClick={() => { setToken(""); setAuthed(false); setSources(null); }} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white" title="Выйти"><Icon name="LogOut" size={16} /></button>
        </div>
      </header>

      {err && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100 mb-5">{err} <button onClick={load} className="underline ml-2">Повторить</button></div>}
      {!sources && !err && <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-36 rounded-2xl bg-white/5 animate-pulse" />)}</div>}

      {sources && sources.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[[String(sources.length), "источников"], [String(okCount), "работают без ошибок"], [String(errCount), "требуют внимания"], [num(rows), "строк в последних загрузках"]].map(([v, l], i) => (
            <div key={l} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
              <div className={`font-['Oswald',sans-serif] text-3xl font-bold ${i === 2 && errCount ? "text-rose-300" : "text-white"}`}>{v}</div>
              <div className="text-xs text-white/50 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      {sources && !sources.length && (
        <div className="rounded-3xl border-2 border-dashed border-white/15 p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-4"><Icon name="Plug" size={26} /></div>
          <h2 className="text-xl font-semibold text-white mb-2">Подключите первый источник</h2>
          <p className="text-white/55 text-sm max-w-lg mx-auto mb-6">Google Таблица, amoCRM, Битрикс24, 1С, МойСклад, Метрика или своя база — данные будут загружаться сами, очищаться от дублей и сразу открываться в BI.</p>
          <button onClick={() => setWizard("new")} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-semibold text-white inline-flex items-center gap-2"><Icon name="Plus" size={17} />Подключить источник</button>
          <p className="text-xs text-white/40 mt-4">Попробовать быстро: создайте Google Таблицу, откройте доступ по ссылке и вставьте её адрес.</p>
        </div>
      )}

      <div className="space-y-3">
        {sources?.map(s => {
          const k = KIND[s.kind];
          const st = STATUS[running[s.id] ? "running" : s.status] || STATUS.new;
          const hasData = !!s.last_rows && !!s.last_run_at;
          return (
            <div key={s.id} className={`bg-white/[0.04] border rounded-2xl p-5 ${s.status === "error" ? "border-rose-400/30" : "border-white/10"}`}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${k?.color} flex items-center justify-center`}><Icon name={k?.icon || "Database"} size={21} /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white truncate">{s.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${st[1]}`}><Icon name={st[2]} size={11} className={st[2] === "Loader2" ? "animate-spin" : ""} />{st[0]}</span>
                    </div>
                    <div className="text-xs text-white/45 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{k?.title}</span>
                      <span className="flex items-center gap-1"><Icon name="CalendarClock" size={11} />{SCHEDULE_LABEL[s.schedule]}</span>
                      <span>обновлено: {ago(s.last_run_at)}</span>
                      {s.next_run_at && s.schedule !== "manual" && <span>следующее: {ago(s.next_run_at)}</span>}
                      {hasData && <span className="text-white/70">{num(s.last_rows)} строк · {s.columns.length} колонок</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => run(s)} disabled={running[s.id]} className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-white flex items-center gap-1.5 disabled:opacity-50">
                    <Icon name={running[s.id] ? "Loader2" : "RefreshCw"} size={14} className={running[s.id] ? "animate-spin" : ""} />Обновить сейчас
                  </button>
                  {hasData && <Link to={`/analytics/bi?pipe=${encodeURIComponent(s.json_url)}`} className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white flex items-center gap-1.5"><Icon name="LayoutDashboard" size={14} />Открыть в BI</Link>}
                  {hasData && <a href={s.csv_url} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-white/80 flex items-center gap-1.5" title="Скачать CSV"><Icon name="Download" size={14} />CSV</a>}
                  <button onClick={() => setHistory(s)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70" title="История загрузок"><Icon name="History" size={15} /></button>
                  <button onClick={() => setWizard(s)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70" title="Настройки"><Icon name="Settings2" size={15} /></button>
                  <button onClick={() => remove(s)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 text-white/50 hover:text-rose-200" title="Отключить"><Icon name="Trash2" size={15} /></button>
                </div>
              </div>
              {s.status === "error" && s.last_error && (
                <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-400/25 px-3.5 py-2.5 text-sm text-rose-100 flex gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-rose-300 shrink-0 mt-0.5" />
                  <div className="flex-1">{s.last_error}{s.fail_count > 1 && <span className="text-rose-200/60"> · ошибок подряд: {s.fail_count}</span>}</div>
                  <button onClick={() => setWizard(s)} className="text-rose-200 underline shrink-0">Исправить</button>
                </div>
              )}
              {hasData && (
                <details className="mt-3 group">
                  <summary className="text-xs text-white/45 hover:text-white cursor-pointer list-none flex items-center gap-1"><Icon name="Link2" size={12} />Ссылки для Excel, DataLens, Power BI<Icon name="ChevronDown" size={12} className="group-open:rotate-180 transition-transform" /></summary>
                  <div className="grid md:grid-cols-2 gap-2 mt-2">
                    {[["CSV — Excel «Данные → Из интернета», DataLens, Google Таблицы", s.csv_url], ["JSON (gzip) — для разработчиков и своих систем", s.json_url]].map(([l, u]) => (
                      <div key={u} className="bg-black/30 rounded-xl p-2.5">
                        <div className="text-[11px] text-white/45 mb-1">{l}</div>
                        <div className="flex gap-2 items-center"><code className="text-[11px] text-cyan-200 truncate flex-1">{u}</code><button onClick={() => copy(u)} className="text-white/50 hover:text-white shrink-0"><Icon name="Copy" size={14} /></button></div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/35 mt-1.5">Ссылки постоянные: после каждой загрузки по ним лежат свежие данные. Не публикуйте их в открытом доступе.</p>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-8 bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-white">Нет нужного источника или нужна сложная логика?</div>
            <p className="text-sm text-white/55">Wildberries, Ozon, Директ, GetCourse, iiko, свой API, объединение нескольких систем в одну витрину — настроим под ключ.</p>
          </div>
          <button onClick={() => setUpgrade(true)} className="shrink-0 px-5 py-2.5 rounded-xl bg-white text-[#10101c] font-semibold text-sm">Обсудить внедрение</button>
        </div>
      )}

      {wizard && plan && (
        <SourceWizard initial={wizard === "new" ? undefined : wizard} plan={plan} onClose={() => setWizard(null)} onUpgrade={() => { setWizard(null); setUpgrade(true); }}
          onSaved={(s, now) => { setWizard(null); load().then(() => { if (now) run(s); }); }} />
      )}
      {history && <RunHistory source={history} onClose={() => setHistory(null)} />}
      {upgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setUpgrade(false)} />
          <div className="relative w-full max-w-lg bg-[#10101c] border border-white/10 rounded-2xl p-6">
            <button onClick={() => setUpgrade(false)} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
            <PipesLeadForm plan={user?.plan === "free" ? "Бизнес" : "Внедрение под ключ"} email={user?.email} onDone={() => setUpgrade(false)} />
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#1a1a2e] border border-white/15 rounded-xl px-5 py-3 text-sm text-white shadow-2xl max-w-[90vw]">{toast}</div>}
    </>
  );
}
