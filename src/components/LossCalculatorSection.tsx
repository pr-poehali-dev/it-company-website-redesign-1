import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const fields = [
  { key: "staff", label: "Сотрудников с рутинной работой", min: 1, max: 200, step: 1, suffix: "чел." },
  { key: "salary", label: "Средняя зарплата с налогами", min: 30000, max: 300000, step: 5000, suffix: "₽" },
  { key: "hours", label: "Часов в день на рутину", min: 0.5, max: 6, step: 0.5, suffix: "ч" },
  { key: "leads", label: "Заявок в месяц", min: 0, max: 3000, step: 10, suffix: "шт." },
  { key: "check", label: "Средний чек", min: 1000, max: 1000000, step: 1000, suffix: "₽" },
] as const;

type Key = (typeof fields)[number]["key"];

export default function LossCalculatorSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  const [v, setV] = useState<Record<Key, number>>({ staff: 10, salary: 90000, hours: 2, leads: 300, check: 30000 });
  const [touched, setTouched] = useState(false);

  const r = useMemo(() => {
    const hourCost = v.salary / 168;
    const routine = v.staff * v.hours * 21 * hourCost;
    const routineSaved = routine * 0.5;
    const lostLeads = v.leads * 0.1;
    const leadsBack = lostLeads * 0.5 * 0.15 * v.check;
    const total = routineSaved + leadsBack;
    const cost = Math.min(500000, Math.max(100000, v.staff * 15000));
    const payback = total > 0 ? cost / total : 0;
    return { routine, routineSaved, lostLeads, leadsBack, total, cost, payback };
  }, [v]);

  const set = (k: Key, val: number) => {
    setV((p) => ({ ...p, [k]: val }));
    if (!touched) {
      setTouched(true);
      ymGoal("loss_calc_used");
    }
  };

  return (
    <section id="loss" className="py-24 relative">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-14">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-red-300 border border-red-500/30 mb-6">
            <Icon name="Calculator" size={14} />
            Калькулятор потерь
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Сколько денег вы теряете{" "}
            <span className="gradient-text">на ручной работе?</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Подвиньте ползунки под свой бизнес — расчёт обновится сразу
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-8">
          <AnimatedSection>
            <div className="glass neon-border rounded-3xl p-7 space-y-6">
              {fields.map((f) => (
                <div key={f.key}>
                  <div className="flex justify-between items-baseline mb-2">
                    <label htmlFor={`loss-${f.key}`} className="text-sm text-white/70">{f.label}</label>
                    <span className="font-oswald text-lg text-white">
                      {fmt(v[f.key])} <span className="text-white/40 text-sm">{f.suffix}</span>
                    </span>
                  </div>
                  <input
                    id={`loss-${f.key}`}
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={v[f.key]}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="glass neon-border rounded-3xl p-7 h-full flex flex-col">
              <div className="text-white/50 text-sm mb-1">Потенциальная экономия</div>
              <div className="font-oswald text-5xl md:text-6xl font-bold gradient-text mb-1">
                ≈ {fmt(r.total)} ₽
              </div>
              <div className="text-white/40 text-sm mb-7">в месяц</div>

              <div className="space-y-3 mb-7">
                <div className="flex justify-between gap-4 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-sm text-white/60">Рутина стоит вам сейчас</span>
                  <span className="text-sm font-semibold text-red-400 whitespace-nowrap">{fmt(r.routine)} ₽/мес</span>
                </div>
                <div className="flex justify-between gap-4 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-sm text-white/60">Автоматизация половины рутины</span>
                  <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap">+{fmt(r.routineSaved)} ₽</span>
                </div>
                <div className="flex justify-between gap-4 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-sm text-white/60">Возврат потерянных заявок (~{fmt(r.lostLeads)} в мес.)</span>
                  <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap">+{fmt(r.leadsBack)} ₽</span>
                </div>
                <div className="flex justify-between gap-4 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-sm text-white/60">Окупаемость внедрения</span>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">
                    {r.payback > 0 ? (r.payback < 1 ? "меньше месяца" : `≈ ${r.payback.toFixed(1).replace(".", ",")} мес.`) : "—"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/35 leading-relaxed mb-6">
                Оценка ориентировочная: берём автоматизацию 50% рутины, потерю 10% заявок, возврат половины из них
                и конверсию 15%. Точный расчёт по вашим данным — на бесплатном AI-аудите.
              </p>

              <button
                onClick={() => { ymGoal("cta_click", { source: "loss_calc", total: Math.round(r.total) }); scrollTo("#contacts"); }}
                className="mt-auto w-full btn-gradient py-4 rounded-2xl text-base font-semibold text-white flex items-center justify-center gap-2"
              >
                Получить персональный расчёт
                <Icon name="ArrowRight" size={18} />
              </button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
