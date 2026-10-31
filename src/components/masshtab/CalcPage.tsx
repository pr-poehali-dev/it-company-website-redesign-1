import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import LeadForm from "./LeadForm";

const FIELDS = [
  { k: "budget", l: "Рекламный бюджет в месяц", u: "₽", step: 1000 },
  { k: "buyers", l: "Новых покупателей в месяц", u: "чел.", step: 1 },
  { k: "check", l: "Средний чек", u: "₽", step: 50 },
  { k: "margin", l: "Наценка (валовая маржа)", u: "%", step: 1 },
  { k: "orders", l: "Покупок одного клиента за всё время", u: "шт.", step: 0.5 },
] as const;

type Key = (typeof FIELDS)[number]["k"];
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function CalcPage() {
  const [v, setV] = useState<Record<Key, number>>({ budget: 60000, buyers: 60, check: 350, margin: 60, orders: 3 });
  const r = useMemo(() => {
    const cac = v.buyers > 0 ? v.budget / v.buyers : 0;
    const gp = v.check * (v.margin / 100);
    const ltv = gp * v.orders;
    const profit = ltv - cac;
    const roi = cac > 0 ? (ltv - cac) / cac : 0;
    const payback = gp > 0 ? Math.ceil(cac / gp) : 0;
    return { cac, gp, ltv, profit, roi, payback, ratio: cac > 0 ? ltv / cac : 0 };
  }, [v]);
  const ok = r.profit > 0;
  const verdict = r.ratio >= 3 ? "Реклама окупается с запасом — можно масштабировать бюджет." : r.ratio >= 1 ? "Реклама окупается, но запас тонкий: рост ставок или падение конверсии уведут её в минус." : "Каждый новый клиент приносит убыток. Увеличение бюджета только ускорит потери.";
  const summary = `Бюджет ${rub(v.budget)}, покупателей ${v.buyers}, чек ${rub(v.check)}, маржа ${v.margin}%, покупок ${v.orders}. CAC ${rub(r.cac)}, LTV ${rub(r.ltv)}, итог ${rub(r.profit)} на клиенте.`;
  return (
    <MShell active="/masshtab/kalkulyator">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <Crumbs items={[{ label: "Калькулятор окупаемости клиента" }]} />
        <Kicker className="mt-6">Инструмент</Kicker>
        <h1 className={`${serif} font-bold text-4xl md:text-5xl mt-2 leading-[1.05] max-w-3xl`}>Калькулятор CAC и LTV: окупается ли ваша реклама</h1>
        <p className="text-lg text-[#5b5550] mt-3 max-w-2xl">Пять цифр — и видно, зарабатываете вы на новом клиенте или доплачиваете за него. Значения по умолчанию — из нашего разбора кофейни, которая теряла 790 ₽ на каждом покупателе.</p>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 mt-8">
          <div className="bg-white border border-[#e2d9cb] rounded-lg p-6 space-y-4">
            {FIELDS.map((f) => (
              <label key={f.k} className="block">
                <span className="text-sm font-semibold">{f.l}</span>
                <div className="flex items-center mt-1.5 border border-[#d9cfc0] rounded focus-within:border-[#14110f]">
                  <input type="number" min={0} step={f.step} value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: Math.max(0, Number(e.target.value) || 0) })}
                    className="flex-1 bg-transparent px-3 py-2.5 text-lg font-bold focus:outline-none min-w-0" />
                  <span className="px-3 text-sm text-[#8a8278]">{f.u}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-4">
            <div className={`rounded-lg p-6 ${ok ? "bg-[#14110f] text-white" : "bg-[#d6402b] text-white"}`}>
              <div className="text-sm text-white/70">Итог на одном клиенте за всё время</div>
              <div className={`${serif} font-bold text-5xl mt-1`}>{r.profit > 0 ? "+" : ""}{rub(r.profit)}</div>
              <p className="mt-3 text-white/85">{verdict}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["CAC — стоимость клиента", rub(r.cac)],
                ["LTV — прибыль с клиента", rub(r.ltv)],
                ["Прибыль с одной покупки", rub(r.gp)],
                ["Окупается с покупки №", r.payback > 0 ? String(r.payback) : "—"],
                ["ROI", `${Math.round(r.roi * 100)}%`],
                ["LTV / CAC", r.ratio.toFixed(1).replace(".", ",")],
              ].map(([l, x]) => (
                <div key={l} className="bg-white border border-[#e2d9cb] rounded-lg p-4">
                  <div className="text-xs text-[#8a8278]">{l}</div>
                  <div className="font-extrabold text-xl mt-1">{x}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8a8278]">Ориентир: LTV / CAC от 3 — здоровая реклама, от 1 до 3 — на грани, меньше 1 — убыток. Расчёт по валовой прибыли, без постоянных расходов.</p>
          </div>
        </div>

        <section className="mt-12 grid md:grid-cols-2 gap-10 items-start bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-10">
          <div>
            <Kicker>Бесплатный разбор</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>Получите разбор своих цифр и шаблон в Excel</h2>
            <p className="text-[#5b5550] mt-3">Пришлём шаблон расчёта юнит-экономики по каналам и короткий разбор: где вы теряете клиентов и что исправить в первую очередь. Ваши текущие цифры приложатся к заявке автоматически.</p>
            <Link to="/masshtab/otchety" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#d6402b] mt-5 hover:underline">Полная модель юнит-экономики и бюджета<Icon name="ArrowRight" size={15} /></Link>
          </div>
          <LeadForm kind="calc" cta="Получить разбор и шаблон" prefix={summary} placeholder="Чем занимается компания и какие каналы рекламы используете" />
        </section>
      </div>
    </MShell>
  );
}
