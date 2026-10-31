import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import LeadForm from "./LeadForm";

type F = { k: string; l: string; u: string };
const GROUPS: { t: string; f: F[] }[] = [
  { t: "Запасы", f: [{ k: "stock", l: "Средний товарный запас", u: "млн ₽" }, { k: "stockCut", l: "Снижение запаса", u: "%" }, { k: "rate", l: "Стоимость денег", u: "% годовых" }] },
  { t: "Продажи", f: [{ k: "revenue", l: "Выручка в год", u: "млн ₽" }, { k: "margin", l: "Валовая маржа", u: "%" }, { k: "lost", l: "Возврат упущенных продаж", u: "% выручки" }] },
  { t: "Списания и реклама", f: [{ k: "writeoff", l: "Списания в год", u: "млн ₽" }, { k: "writeoffCut", l: "Снижение списаний", u: "%" }, { k: "ads", l: "Рекламный бюджет в год", u: "млн ₽" }, { k: "adsCut", l: "Экономия рекламы", u: "%" }] },
  { t: "Стоимость проекта", f: [{ k: "once", l: "Разовые затраты: пилот, данные, внедрение", u: "млн ₽" }, { k: "yearly", l: "Ежегодные: лицензии, сопровождение", u: "млн ₽" }] },
];
const DEF: Record<string, number> = { stock: 400, stockCut: 12, rate: 18, revenue: 3000, margin: 25, lost: 1, writeoff: 24, writeoffCut: 20, ads: 0, adsCut: 15, once: 6.5, yearly: 3 };
const m = (n: number) => `${n.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₽`;

export default function RoiCalcPage() {
  const [v, setV] = useState(DEF);
  const r = useMemo(() => {
    const stock = v.stock * (v.stockCut / 100) * (v.rate / 100);
    const sales = v.revenue * (v.lost / 100) * (v.margin / 100);
    const wo = v.writeoff * (v.writeoffCut / 100);
    const ads = v.ads * (v.adsCut / 100);
    const year = stock + sales + wo + ads;
    const effect3 = year * 0.5 + year * 2;
    const cost3 = v.once + v.yearly * 3;
    const net = effect3 - cost3;
    const roi = cost3 > 0 ? net / cost3 : 0;
    let acc = -v.once;
    let payback = 0;
    for (let i = 1; i <= 36; i++) {
      acc += (i <= 12 ? year * 0.5 : year) / 12 - v.yearly / 12;
      if (acc >= 0) { payback = i; break; }
    }
    return { stock, sales, wo, ads, year, effect3, cost3, net, roi, payback };
  }, [v]);
  const summary = `Запас ${v.stock} млн, выручка ${v.revenue} млн, проект ${v.once}+${v.yearly}/год млн. Эффект ${m(r.year)}/год, за 3 года ${m(r.net)} чистыми, ROI ${Math.round(r.roi * 100)}%, окупаемость ${r.payback || "—"} мес.`;
  return (
    <MShell active="/masshtab/kalkulyator-analitiki">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <Crumbs items={[{ label: "Калькулятор окупаемости аналитики" }]} />
        <Kicker className="mt-6">Инструмент</Kicker>
        <h1 className={`${serif} font-bold text-4xl md:text-5xl mt-2 leading-[1.05] max-w-3xl`}>Окупится ли аналитика: ROI и срок окупаемости пилота</h1>
        <p className="text-lg text-[#5b5550] mt-3 max-w-2xl">Введите свои запасы, выручку и стоимость проекта. Значения по умолчанию — из <Link to="/masshtab/$slug" params={{ slug: "pilot-prediktivnoy-analitiki-skolko-stoit-i-kogda-okupaetsya" }} className="text-[#d6402b] font-semibold hover:underline">условного примера дистрибьютора</Link>. Подставляйте нижнюю границу ожиданий, а не обещания из презентаций.</p>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 mt-8">
          <div className="space-y-4">
            {GROUPS.map((g) => (
              <div key={g.t} className="bg-white border border-[#e2d9cb] rounded-lg p-5">
                <div className="font-bold mb-3">{g.t}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {g.f.map((f) => (
                    <label key={f.k} className="block">
                      <span className="text-xs text-[#5b5550]">{f.l}</span>
                      <div className="flex items-center mt-1 border border-[#d9cfc0] rounded focus-within:border-[#14110f]">
                        <input type="number" min={0} step="any" value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: Math.max(0, Number(e.target.value) || 0) })}
                          className="flex-1 bg-transparent px-3 py-2 font-bold focus:outline-none min-w-0" />
                        <span className="px-2 text-xs text-[#8a8278] whitespace-nowrap">{f.u}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className={`rounded-lg p-6 text-white ${r.net > 0 ? "bg-[#0b1a33]" : "bg-[#d6402b]"}`}>
              <div className="text-sm text-white/70">Чистый эффект за 3 года</div>
              <div className={`${serif} font-bold text-5xl mt-1`}>{r.net > 0 ? "+" : ""}{m(r.net)}</div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div><div className="text-xs text-white/60">ROI за 3 года</div><div className="font-extrabold text-2xl">{Math.round(r.roi * 100)}%</div></div>
                <div><div className="text-xs text-white/60">Окупаемость разовых затрат</div><div className="font-extrabold text-2xl">{r.payback > 0 ? `${r.payback} мес.` : "больше 3 лет"}</div></div>
              </div>
            </div>
            <div className="bg-white border border-[#e2d9cb] rounded-lg p-5 text-sm space-y-2">
              {[["Деньги, освобождённые из запасов", r.stock], ["Возвращённые продажи (прибыль)", r.sales], ["Снижение списаний", r.wo], ["Экономия рекламы", r.ads]].map(([l, x]) => (
                <div key={l as string} className="flex justify-between gap-3"><span className="text-[#5b5550]">{l}</span><b>{m(x as number)}/год</b></div>
              ))}
              <div className="flex justify-between gap-3 pt-2 border-t border-[#efe7da]"><span className="font-bold">Эффект в год на полной мощности</span><b>{m(r.year)}</b></div>
              <div className="flex justify-between gap-3"><span className="text-[#5b5550]">Затраты за 3 года</span><b>{m(r.cost3)}</b></div>
            </div>
            <p className="text-xs text-[#8a8278]">В первый год считаем половину эффекта — он набирается постепенно. Расчёт ориентировочный и не учитывает налоги.</p>
          </div>
        </div>

        <section className="mt-12 grid md:grid-cols-2 gap-10 items-start bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-10">
          <div>
            <Kicker>Проверка расчёта</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>Проверим вашу модель на реальных данных</h2>
            <p className="text-[#5b5550] mt-3">Аналитик посмотрит ваши цифры, скажет, какие эффекты реалистичны для вашей отрасли, и предложит формат пилота на 2–3 месяца с измеримым результатом. Текущий расчёт приложится к заявке.</p>
            <Link to="/masshtab/$slug" params={{ slug: "kak-analitika-snizhaet-izderzhki-gde-realny-15-20-procentov" }} className="inline-block text-sm font-bold text-[#d6402b] mt-5 hover:underline">Где реальны 15–20 процентов экономии →</Link>
          </div>
          <LeadForm kind="calc" cta="Обсудить пилот" prefix={`Калькулятор аналитики: ${summary}`} placeholder="Отрасль, какие данные есть: 1С, CRM, Excel" />
        </section>
      </div>
    </MShell>
  );
}
