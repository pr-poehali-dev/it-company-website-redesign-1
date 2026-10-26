import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Service, rub } from "./servicesData";

export interface CalcResult {
  price: number;
  days: number;
  summary: string;
}

export default function ServiceCalculator({ service, onOrder }: { service: Service; onOrder: (r: CalcResult) => void }) {
  const [sel, setSel] = useState<Record<string, string>>(() => Object.fromEntries(service.params.map(p => [p.id, p.options[0].id])));
  const [addons, setAddons] = useState<string[]>([]);

  const r = useMemo<CalcResult>(() => {
    let price = 0;
    let days = 0;
    const parts: string[] = [];
    service.params.forEach(p => {
      const o = p.options.find(x => x.id === sel[p.id]) || p.options[0];
      price += o.price;
      days += o.days;
      parts.push(`${p.label}: ${o.label}`);
    });
    service.addons.filter(a => addons.includes(a.id)).forEach(a => { price += a.price; days += a.days; parts.push(`+ ${a.label}`); });
    return { price, days, summary: parts.join("; ") };
  }, [sel, addons, service]);

  return (
    <div className="bg-white/[0.03] border border-violet-500/30 rounded-2xl p-5">
      <div className="font-semibold text-white flex items-center gap-2 mb-4"><Icon name="Calculator" size={18} className="text-violet-300" />Калькулятор стоимости</div>
      <div className="space-y-4">
        {service.params.map(p => (
          <div key={p.id}>
            <div className="text-xs text-white/50 mb-1.5">{p.label}</div>
            <div className="grid gap-1.5">
              {p.options.map(o => (
                <button key={o.id} onClick={() => setSel(s => ({ ...s, [p.id]: o.id }))}
                  className={`text-left px-3 py-2 rounded-xl border flex items-center justify-between gap-3 transition-colors ${sel[p.id] === o.id ? "border-violet-500/70 bg-violet-600/15" : "border-white/10 hover:border-white/25"}`}>
                  <span>
                    <span className="text-sm text-white">{o.label}</span>
                    {o.hint && <span className="block text-[11px] text-white/45">{o.hint}</span>}
                  </span>
                  <span className="text-xs text-white/55 shrink-0">{o.price ? `${p === service.params[0] ? "" : "+"}${rub(o.price)}` : "включено"}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {service.addons.length > 0 && (
          <div>
            <div className="text-xs text-white/50 mb-1.5">Дополнительно</div>
            <div className="space-y-1.5">
              {service.addons.map(a => (
                <label key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/25 cursor-pointer">
                  <input type="checkbox" checked={addons.includes(a.id)} onChange={e => setAddons(x => (e.target.checked ? [...x, a.id] : x.filter(y => y !== a.id)))} className="accent-violet-500" />
                  <span className="text-sm text-white/80 flex-1">{a.label}</span>
                  <span className="text-xs text-white/55">+{rub(a.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-xs text-white/45">Ориентир стоимости</div>
            <div className="font-['Oswald',sans-serif] text-3xl font-bold text-white">{rub(r.price)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/45">Срок</div>
            <div className="text-white font-semibold">{r.days} раб. дн.</div>
          </div>
        </div>
        <button onClick={() => onOrder(r)} className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-5 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2">
          <Icon name="Send" size={17} />Получить КП с этой ценой
        </button>
        <p className="text-[11px] text-white/40 mt-2 text-center">Цена фиксируется в договоре после созвона. Без НДС (УСН).</p>
      </div>
    </div>
  );
}
