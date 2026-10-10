import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

const fields = [
  { key: "staff", label: "Сколько сотрудников занято рутиной", min: 1, max: 100, step: 1, suffix: "чел." },
  { key: "salary", label: "Их средняя зарплата с налогами", min: 30000, max: 300000, step: 5000, suffix: "₽" },
  { key: "hours", label: "Сколько часов в день уходит на рутину", min: 0.5, max: 6, step: 0.5, suffix: "ч" },
] as const;

type Key = (typeof fields)[number]["key"];

export default function LossCalculatorSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  const [v, setV] = useState<Record<Key, number>>({ staff: 5, salary: 80000, hours: 2 });
  const [touched, setTouched] = useState(false);

  const r = useMemo(() => {
    const hourCost = v.salary / 168;
    const hoursMonth = v.staff * v.hours * 21;
    const cost = hoursMonth * hourCost;
    return { hoursMonth, cost, year: cost * 12 };
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
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-cyan-300 border border-cyan-500/30 mb-6">
            <Icon name="Calculator" size={14} />
            Простой расчёт
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Сколько стоит{" "}
            <span className="gradient-text">ручная рутина?</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Посчитайте, сколько вы платите сотрудникам за повторяющуюся работу: перенос данных, ответы на одни и те же вопросы, отчёты
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-8">
          <AnimatedSection>
            <div className="glass neon-border rounded-3xl p-7 space-y-7">
              {fields.map((f) => (
                <div key={f.key}>
                  <div className="flex justify-between items-baseline mb-2 gap-4">
                    <label htmlFor={`loss-${f.key}`} className="text-sm text-white/70">{f.label}</label>
                    <span className="font-oswald text-lg text-white whitespace-nowrap">
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
              <div className="text-white/50 text-sm mb-1">Рутина обходится вам примерно в</div>
              <div className="font-oswald text-5xl md:text-6xl font-bold gradient-text mb-1">
                {fmt(r.cost)} ₽
              </div>
              <div className="text-white/40 text-sm mb-7">в месяц</div>

              <div className="space-y-3 mb-7">
                <div className="flex justify-between gap-4 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-sm text-white/60">Часов в месяц</span>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">{fmt(r.hoursMonth)} ч</span>
                </div>
                <div className="flex justify-between gap-4 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-sm text-white/60">В год</span>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">{fmt(r.year)} ₽</span>
                </div>
              </div>

              <p className="text-sm text-white/50 leading-relaxed mb-6">
                Не всю рутину можно и нужно автоматизировать. На консультации разберём, какую часть реально
                передать системе и окупится ли это в вашем случае.
              </p>

              <button
                onClick={() => { ymGoal("cta_click", { source: "loss_calc", total: Math.round(r.cost) }); scrollTo("#contacts"); }}
                className="mt-auto w-full btn-gradient py-4 rounded-2xl text-base font-semibold text-white flex items-center justify-center gap-2"
              >
                Обсудить на консультации
                <Icon name="ArrowRight" size={18} />
              </button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
