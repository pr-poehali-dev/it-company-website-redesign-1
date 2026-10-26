import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import OrderCard from "./OrderCard";
import BiSharesPanel from "./BiSharesPanel";
import { OrderStatus, OrdersResponse, ReportOrder, STATUS_META, STATUS_ORDER, ordersGet, ordersPost } from "./ordersApi";

export default function ReportOrdersModule() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [info, setInfo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ordersGet({ status, q: q.trim() }).catch(() => null);
    if (r && !r.error) setData(r);
    setLoading(false);
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const patch = (id: number, p: Partial<ReportOrder>) =>
    setData(d => d && { ...d, items: d.items.map(x => (x.id === id ? { ...x, ...p } : x)) });

  async function deleteTests() {
    if (!data?.test_count || !confirm(`Удалить тестовые заказы (${data.test_count} шт.) и тестовые заявки Радара и аналитики?`)) return;
    const r = await ordersPost<{ deleted: number; deleted_requests: number }>({ action: "delete_tests" });
    if (r.ok) { setInfo(`Удалено заказов: ${r.deleted}, заявок: ${r.deleted_requests}`); setSel(new Set()); load(); }
  }

  async function deleteSelected() {
    if (!sel.size || !confirm(`Удалить выбранные заказы (${sel.size} шт.)?`)) return;
    const r = await ordersPost<{ deleted: number }>({ action: "delete", ids: [...sel] });
    if (r.ok) { setInfo(`Удалено: ${r.deleted}`); setSel(new Set()); load(); }
  }

  const by = data?.by_status || {};
  const total = STATUS_ORDER.reduce((a, s) => a + (by[s]?.n || 0), 0);
  const revenue = (by.paid?.s || 0) + (by.sent?.s || 0);
  const pipeline = (by.new?.s || 0) + (by.invoiced?.s || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Icon name="ShoppingBag" size={22} className="text-violet-400" />Заказы отчётов</h2>
          <p className="text-sm text-white/50 mt-1">Заявки из раздела «Бизнес-аналитика». Порядок работы: выставить счёт → отметить оплату → сформировать отчёт → отправить клиенту.</p>
        </div>
        <div className="flex gap-2">
          {data && data.test_count > 0 && (
            <button onClick={deleteTests} className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm hover:bg-rose-500/20 flex items-center gap-1.5">
              <Icon name="Eraser" size={15} />Удалить тестовые ({data.test_count})
            </button>
          )}
          <button onClick={load} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white" title="Обновить">
            <Icon name={loading ? "Loader2" : "RefreshCw"} size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <button onClick={() => setStatus("")} className={`text-left rounded-2xl p-4 border ${status === "" ? "border-violet-500/60 bg-violet-500/10" : "border-white/10 bg-white/[0.03]"}`}>
          <div className="text-2xl font-bold text-white">{total}</div><div className="text-xs text-white/50">все заказы</div>
        </button>
        {STATUS_ORDER.map(s => (
          <button key={s} onClick={() => setStatus(status === s ? "" : s)}
            className={`text-left rounded-2xl p-4 border ${status === s ? "border-violet-500/60 bg-violet-500/10" : "border-white/10 bg-white/[0.03]"}`}>
            <div className="text-2xl font-bold text-white">{by[s]?.n || 0}</div>
            <div className="text-xs text-white/50 flex items-center gap-1"><Icon name={STATUS_META[s].icon} size={11} />{STATUS_META[s].label}</div>
          </button>
        ))}
        <div className="rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="text-xl font-bold text-emerald-300">{revenue.toLocaleString("ru-RU")} ₽</div>
          <div className="text-xs text-white/50">оплачено · в работе {pipeline.toLocaleString("ru-RU")} ₽</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Имя, почта, телефон, компания, ИНН, название отчёта"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60" />
        </div>
        {sel.size > 0 && (
          <>
            <span className="text-sm text-white/60">Выбрано: {sel.size}</span>
            <button onClick={deleteSelected} className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm flex items-center gap-1.5"><Icon name="Trash2" size={14} />Удалить выбранные</button>
            <button onClick={() => setSel(new Set())} className="text-sm text-white/50 hover:text-white">Снять выбор</button>
          </>
        )}
      </div>
      {info && <div className="text-sm text-emerald-300">{info}</div>}

      <BiSharesPanel />

      {loading && !data ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl bg-white/5 animate-pulse" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/50">
          <Icon name="Inbox" size={28} className="mx-auto mb-2 text-white/30" />Заказов пока нет. Они появятся, когда клиенты закажут отчёт на mat-labs.ru/analytics.
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map(o => (
            <OrderCard key={o.id} o={o} selected={sel.has(o.id)}
              onSelect={v => setSel(s => { const n = new Set(s); if (v) n.add(o.id); else n.delete(o.id); return n; })}
              onChange={p => { patch(o.id, p); if (p.status) load(); }}
              onDeleted={() => { setData(d => d && { ...d, items: d.items.filter(x => x.id !== o.id) }); load(); }} />
          ))}
        </div>
      )}
    </div>
  );
}
