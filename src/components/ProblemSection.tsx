import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";

export default function ProblemSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  return (
    <section id="problem" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/5 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Левая — проблема */}
          <AnimatedSection>
            <div>
              <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-sm text-red-300 border border-red-500/30 mb-6">
                <Icon name="AlertTriangle" size={14} className="text-red-400" />
                Проблема
              </div>
              <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Большинство компаний{" "}
                <span className="text-red-400">теряют клиентов</span>{" "}
                из-за процессов
              </h2>

              <div className="space-y-3 mb-8">
                {[
                  "Заявки обрабатываются вручную",
                  "Клиенты ждут ответа часами",
                  "Сотрудники перегружены рутиной",
                  "Часть обращений просто теряется",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3">
                    <Icon name="X" size={15} className="text-red-400 shrink-0" />
                    <span className="text-sm text-white/70">{text}</span>
                  </div>
                ))}
              </div>

              <p className="text-white/50 text-base leading-relaxed border-l-2 border-red-500/40 pl-4">
                В итоге бизнес теряет деньги, даже не замечая этого.
                Мы находим и устраняем эти потери с помощью автоматизации.
              </p>
            </div>
          </AnimatedSection>

          {/* Правая — решение */}
          <AnimatedSection>
            <div className="glass neon-border rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-sm text-emerald-300 border border-emerald-500/30 mb-6">
                <Icon name="CheckCircle" size={14} className="text-emerald-400" />
                Что вы получите
              </div>
              <h3 className="font-oswald text-2xl font-bold mb-7 text-white">
                После внедрения автоматизации
              </h3>

              <div className="space-y-4 mb-8">
                {[
                  { icon: "TrendingDown", color: "text-violet-400", bg: "bg-violet-500/10", metric: "до 70%", text: "сокращение ручной работы" },
                  { icon: "Zap", color: "text-cyan-400", bg: "bg-cyan-500/10", metric: "в минуты", text: "быстрые ответы клиентам" },
                  { icon: "ShieldCheck", color: "text-emerald-400", bg: "bg-emerald-500/10", metric: "0", text: "потерянных заявок" },
                  { icon: "BarChart2", color: "text-amber-400", bg: "bg-amber-500/10", metric: "↑", text: "рост конверсии и продаж" },
                  { icon: "Eye", color: "text-pink-400", bg: "bg-pink-500/10", metric: "100%", text: "прозрачные и понятные процессы" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-4 ${item.bg} rounded-xl px-4 py-3`}>
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Icon name={item.icon} size={16} className={item.color} />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`font-oswald font-bold text-lg ${item.color}`}>{item.metric}</span>
                      <span className="text-sm text-white/70">{item.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { ymGoal("cta_click", { source: "problem" }); scrollTo("#contacts"); }}
                className="w-full btn-gradient py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                Найти потери в моём бизнесе
                <Icon name="ArrowRight" size={16} />
              </button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
