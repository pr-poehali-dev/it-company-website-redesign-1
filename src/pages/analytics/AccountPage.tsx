import { useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";
import BizOrderModal from "@/components/biz/BizOrderModal";
import PipesLogin from "@/components/pipes/PipesLogin";
import CompanySearch from "@/components/biz/CompanySearch";
import { PRO_INCLUDES } from "@/components/biz/UnlockModal";
import { useBizAccount } from "@/components/biz/useBizAccount";
import { BizUsage, PRICES, bizPost } from "@/components/biz/bizApi";
import { setToken } from "@/components/pipes/pipesApi";

const LVL = { high: "text-rose-300", mid: "text-amber-300", good: "text-emerald-300" } as const;

export default function AccountPage() {
  const { authed, me, ready, reload } = useBizAccount();
  const [order, setOrder] = useState<"pro" | "corp" | null>(null);
  const [msg, setMsg] = useState("");

  const shell = (c: React.ReactNode) => (
    <BizShell title="Мой кабинет — бизнес-аналитика | МАТ-Лабс" description="Открытые отчёты, слежение за контрагентами и тариф." path="/analytics/account" noindex
      crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Мой кабинет" }]}>{c}</BizShell>
  );

  if (!ready) return shell(<div className="h-64 rounded-2xl bg-white/5 animate-pulse" />);
  if (!authed) return shell(
    <div className="max-w-md mx-auto bg-white/[0.04] border border-violet-500/30 rounded-3xl p-7">
      <PipesLogin bare source="analytics" title="Вход в кабинет аналитики" text="Без пароля: пришлём код на почту. Бесплатно — 3 полных отчёта о компаниях, первый отчёт о рынке и слежение за 3 контрагентами." onDone={reload} />
    </div>
  );
  if (!me) return shell(<div className="h-64 rounded-2xl bg-white/5 animate-pulse" />);

  const add = async (inn: string) => {
    setMsg("");
    const r = await bizPost({ action: "watch_add", inn });
    if (r.error) setMsg(r.error);
    reload();
  };
  const remove = async (inn: string) => { await bizPost({ action: "watch_remove", inn }); reload(); };
  const free = me.user.biz_plan === "free";

  return shell(
    <>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-violet-300 mb-1">{me.user.email}</div>
          <h1 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold">Мой кабинет</h1>
          <div className="text-sm text-white/55 mt-1">Тариф «{me.plan.title}»{me.user.biz_plan_until && !free ? ` · до ${new Date(me.user.biz_plan_until).toLocaleDateString("ru-RU")}` : ""}</div>
        </div>
        <div className="flex gap-2">
          <Link to="/analytics/pipes/app" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 hover:text-white flex items-center gap-1.5"><Icon name="Workflow" size={15} />Конвейер данных</Link>
          <button onClick={() => { setToken(""); window.dispatchEvent(new Event("biz-auth")); }} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white" title="Выйти"><Icon name="LogOut" size={16} /></button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Meter icon="Building2" label="Отчёты о компаниях" u={me.usage.company} />
        <Meter icon="PieChart" label="Отчёты о рынках" u={me.usage.market} />
        <Meter icon="Bell" label="Слежение за компаниями" u={{ ...me.usage.watch, period: "total" }} />
      </div>

      {free && (
        <div className="bg-gradient-to-r from-violet-600/25 to-cyan-600/15 border border-violet-500/40 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold text-white mb-1">Аналитика Про — {PRICES.pro.toLocaleString("ru-RU")} ₽/мес</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">{PRO_INCLUDES.map(t => <span key={t} className="text-xs text-white/65 flex items-center gap-1"><Icon name="Check" size={12} className="text-emerald-300" />{t}</span>)}</div>
          </div>
          <button onClick={() => setOrder("pro")} className="shrink-0 px-5 py-3 rounded-xl bg-white text-[#10101c] font-semibold text-sm">Подключить</button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
        <Card title="Слежение за контрагентами" icon="Bell" right={<span className="text-xs text-white/40">проверяем каждый день</span>}>
          <div className="mb-4"><CompanySearch onPick={add} placeholder="Добавить компанию по названию или ИНН" /></div>
          {msg && <p className="text-sm text-amber-200 mb-3">{msg}</p>}
          {!me.watch.length && <p className="text-sm text-white/50 py-6 text-center">Добавьте клиентов, поставщиков и конкурентов — напишем на почту, если у них сменится статус, руководитель, адрес или появится налоговый долг.</p>}
          <div className="space-y-2">
            {me.watch.map(w => {
              const risk = Number(w.snapshot?.risk ?? 0);
              return (
                <div key={w.inn} className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-['Oswald',sans-serif] font-bold ${risk >= 50 ? "bg-rose-500/15 text-rose-300" : risk >= 20 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{risk}</div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/analytics/company/${w.inn}`} className="text-sm font-medium text-white hover:text-violet-300 truncate block">{w.name || w.inn}</Link>
                      <div className="text-[11px] text-white/40">ИНН {w.inn} · проверено {w.last_checked_at ? new Date(w.last_checked_at).toLocaleDateString("ru-RU") : "—"}</div>
                    </div>
                    <button onClick={() => remove(w.inn)} className="text-white/30 hover:text-rose-300" title="Не следить"><Icon name="X" size={16} /></button>
                  </div>
                  {w.changes?.slice(0, 3).map((c, i) => (
                    <div key={i} className={`text-xs mt-2 flex gap-1.5 ${LVL[c.level]}`}><Icon name="Dot" size={14} className="shrink-0" />{c.text}<span className="text-white/30 ml-auto shrink-0">{new Date(c.at).toLocaleDateString("ru-RU")}</span></div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Открытые отчёты" icon="FileText">
          {!me.unlocks.length && <p className="text-sm text-white/50 py-6 text-center">Здесь появятся отчёты, которые вы открыли. <Link to="/analytics/market" className="text-violet-300 underline">Выбрать рынок</Link></p>}
          <div className="space-y-1.5">
            {me.unlocks.map(u => {
              const [o, r] = u.key.split(":");
              const to = u.kind === "company" ? `/analytics/company/${u.key}` : `/analytics/market/${o}${r && r !== "RU" ? `/${r}` : ""}`;
              return (
                <Link key={u.kind + u.key} to={to} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5">
                  <Icon name={u.kind === "company" ? "Building2" : "PieChart"} size={15} className="text-violet-300 shrink-0" />
                  <span className="text-sm text-white/85 truncate flex-1">{u.title}</span>
                  <span className="text-[11px] text-white/35 shrink-0">{new Date(u.created_at).toLocaleDateString("ru-RU")}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {me.user.biz_plan !== "corp" && (
        <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-white">Комплекс «Отдел продаж» — {PRICES.corp.toLocaleString("ru-RU")} ₽/мес</div>
            <p className="text-sm text-white/55">Аналитика без ограничений, Радар заказчиков с контактами и Конвейер данных на тарифе «Бизнес» — с помощью аналитика при подключении.</p>
          </div>
          <button onClick={() => setOrder("corp")} className="shrink-0 px-5 py-2.5 rounded-xl border border-white/15 text-white text-sm hover:bg-white/5">Узнать подробнее</button>
        </div>
      )}

      {order && <BizOrderModal reportType={order} title={order === "pro" ? "Подписка «Аналитика Про» — 1 месяц" : "Комплекс «Отдел продаж» — 1 месяц"} price={order === "pro" ? PRICES.pro : PRICES.corp}
        includes={order === "pro" ? PRO_INCLUDES : CORP_INCLUDES} onClose={() => setOrder(null)} />}
    </>
  );
}

export const CORP_INCLUDES = [
  "Всё из «Аналитика Про»: 10 отчётов о рынках в месяц",
  "Слежение за 100 контрагентами",
  "Радар заказчиков: контакты, выгрузка в Excel",
  "Конвейер данных «Бизнес»: 15 источников, обновление каждый час",
  "Помощь аналитика с подключением и настройкой отчётов",
];

function Meter({ icon, label, u }: { icon: string; label: string; u: BizUsage }) {
  const unlimited = u.limit == null;
  const pct = unlimited ? 100 : Math.min(100, (u.used / Math.max(1, u.limit!)) * 100);
  const full = !unlimited && u.used >= (u.limit || 0);
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-sm text-white/70 mb-2"><Icon name={icon} size={15} className="text-violet-300" />{label}</div>
      <div className="font-['Oswald',sans-serif] text-2xl font-bold text-white">{unlimited ? "без лимита" : `${u.used} из ${u.limit}`}</div>
      <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden"><div className={`h-full rounded-full ${full ? "bg-amber-400" : "bg-gradient-to-r from-violet-500 to-cyan-400"}`} style={{ width: `${pct}%` }} /></div>
      <div className="text-[11px] text-white/40 mt-1.5">{unlimited ? "в вашей подписке" : u.period === "month" ? "в этом месяце" : "на бесплатном тарифе"}</div>
    </div>
  );
}
