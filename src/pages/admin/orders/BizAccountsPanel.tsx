import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { bizGet, bizPost } from "@/components/biz/bizApi";

interface Acc { id: number; email: string; name: string | null; company: string | null; biz_plan: string; biz_plan_until: string | null; pipes_plan: string; created_at: string; last_login_at: string | null; unlocks: number; watch: number; sources: number }
const PLAN_LABEL: Record<string, string> = { free: "Бесплатный", pro: "Аналитика Про", corp: "Отдел продаж" };

export default function BizAccountsPanel() {
  const [items, setItems] = useState<Acc[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", plan: "pro", months: "1" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await bizGet<{ items: Acc[] }>({ action: "admin_accounts" }).catch(() => null);
    if (r && !r.error) setItems(r.items);
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const r = await bizPost<{ until: string | null }>({ action: "admin_set_plan", email: f.email, plan: f.plan, months: Number(f.months) });
    setBusy(false);
    if (r.error) return setMsg(r.error);
    setMsg(`Готово: ${f.email} — «${PLAN_LABEL[f.plan]}»${r.until ? ` до ${new Date(r.until).toLocaleDateString("ru-RU")}` : ""}`);
    load();
  };

  const paid = items.filter(i => i.biz_plan !== "free").length;
  const cls = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500/60";
  return (
    <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-2xl">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="flex items-center gap-2 font-semibold text-white"><Icon name="Users" size={17} className="text-violet-300" />Аккаунты и подписки аналитики</span>
        <Icon name="ChevronDown" size={16} className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <form onSubmit={save} className="flex flex-wrap gap-2 items-end mb-2">
            <input required type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email клиента" className={`${cls} flex-1 min-w-[220px]`} />
            <select value={f.plan} onChange={e => setF({ ...f, plan: e.target.value })} className={`${cls} [&>option]:bg-[#141424]`}>
              <option value="pro">Аналитика Про</option><option value="corp">Отдел продаж</option><option value="free">Бесплатный (отключить)</option>
            </select>
            <select value={f.months} onChange={e => setF({ ...f, months: e.target.value })} className={`${cls} [&>option]:bg-[#141424]`} disabled={f.plan === "free"}>
              {["1", "3", "6", "12"].map(m => <option key={m} value={m}>{m} мес</option>)}
            </select>
            <button disabled={busy} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white disabled:opacity-60">Включить тариф</button>
          </form>
          <p className="text-xs text-white/40 mb-3">После оплаты счёта введите email клиента — доступ включится сразу, даже если он ещё не входил. «Отдел продаж» также включает Конвейер данных «Бизнес».</p>
          {msg && <p className="text-sm text-emerald-300 mb-3">{msg}</p>}
          <div className="text-xs text-white/50 mb-2">Всего аккаунтов: {items.length} · платных: {paid}</div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="sticky top-0 bg-[#10101c]"><tr className="text-left text-white/40 border-b border-white/10">
                <th className="py-2 pr-2 font-normal">Email</th><th className="py-2 pr-2 font-normal">Тариф</th><th className="py-2 pr-2 font-normal">Отчёты</th><th className="py-2 pr-2 font-normal">Слежение</th><th className="py-2 pr-2 font-normal">Источники</th><th className="py-2 font-normal">Последний вход</th>
              </tr></thead>
              <tbody>{items.map(a => (
                <tr key={a.id} className="border-b border-white/5">
                  <td className="py-2 pr-2 text-white"><button onClick={() => setF({ ...f, email: a.email })} className="hover:text-violet-300">{a.email}</button></td>
                  <td className={`py-2 pr-2 ${a.biz_plan === "free" ? "text-white/50" : "text-emerald-300"}`}>{PLAN_LABEL[a.biz_plan] || a.biz_plan}{a.biz_plan_until && a.biz_plan !== "free" ? ` · до ${new Date(a.biz_plan_until).toLocaleDateString("ru-RU")}` : ""}</td>
                  <td className="py-2 pr-2 text-white/70">{a.unlocks}</td><td className="py-2 pr-2 text-white/70">{a.watch}</td><td className="py-2 pr-2 text-white/70">{a.sources}</td>
                  <td className="py-2 text-white/50">{a.last_login_at ? new Date(a.last_login_at).toLocaleDateString("ru-RU") : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
