import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";

export default function ProblemSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  return (
    <section id="problem" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/5 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Левая колонка — проблема */}
          <AnimatedSection>
            <div>
              <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-sm text-red-300 border border-red-500/30 mb-6">
                <Icon name="AlertTriangle" size={14} className="text-red-400" />
                Проблема
              </div>
              <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Почему бизнес{" "}
                <span className="text-red-400">теряет заявки</span>
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-6">
                Во многих компаниях заявки обрабатываются вручную.
                Клиенты ждут ответа, менеджеры перегружены, а часть обращений просто теряется.
              </p>
              <p className="text-white/50 leading-relaxed mb-8">
                Каждая потерянная заявка — это недополученная выручка.
                И чем дольше клиент ждёт ответа, тем выше шанс, что он уйдёт к конкурентам.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Менеджер не успел перезвонить — клиент ушёл",
                  "Заявка потерялась между почтой и мессенджером",
                  "Нет понимания, сколько заявок и откуда приходит",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3">
                    <Icon name="X" size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-white/60">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Правая колонка — решение */}
          <AnimatedSection>
            <div className="glass neon-border rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-sm text-emerald-300 border border-emerald-500/30 mb-6">
                <Icon name="CheckCircle" size={14} className="text-emerald-400" />
                Решение
              </div>
              <h3 className="font-oswald text-2xl font-bold mb-4 text-white">
                Автоматизируем — и проблема исчезает
              </h3>
              <p className="text-white/50 text-sm leading-relaxed mb-7">
                Мы настраиваем автоматическую обработку заявок и прозрачную систему,
                где ни одно обращение не теряется.
              </p>

              <div className="space-y-4">
                {[
                  { icon: "Clock", color: "text-cyan-400", bg: "bg-cyan-500/10", text: "Быстрые ответы клиентам — AI отвечает за секунды" },
                  { icon: "BarChart2", color: "text-violet-400", bg: "bg-violet-500/10", text: "Прозрачная система обработки заявок" },
                  { icon: "Users", color: "text-emerald-400", bg: "bg-emerald-500/10", text: "Меньше ручной работы — сотрудники заняты важным" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-4 ${item.bg} rounded-xl px-4 py-4`}>
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Icon name={item.icon} size={16} className={item.color} />
                    </div>
                    <p className="text-sm text-white/75 leading-relaxed pt-2">{item.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => scrollTo("#contacts")}
                className="mt-7 w-full btn-gradient py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                Решить эту проблему
                <Icon name="ArrowRight" size={16} />
              </button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
