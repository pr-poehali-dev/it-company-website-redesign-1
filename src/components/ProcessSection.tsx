import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";

export default function ProcessSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  return (
    <>
      {/* КАК МЫ РАБОТАЕМ */}
      <section id="process" className="py-24 relative">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-14 items-start">

            {/* Шаги */}
            <AnimatedSection>
              <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-cyan-300 border border-cyan-500/30 mb-6">
                Как мы работаем
              </div>
              <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-10 leading-tight">
                От разбора до{" "}
                <span className="gradient-text">готового результата</span>
              </h2>

              <div className="space-y-4">
                {[
                  { step: "01", icon: "Search", title: "Анализируем ваш бизнес", desc: "Изучаем текущие процессы, находим, где теряются заявки и время сотрудников" },
                  { step: "02", icon: "Target", title: "Находим точки потерь и роста", desc: "Показываем конкретно: что автоматизировать и какой результат это даст" },
                  { step: "03", icon: "FileText", title: "Предлагаем решение и план", desc: "Называем сроки, стоимость и ожидаемый эффект — без скрытых платежей" },
                  { step: "04", icon: "Rocket", title: "Запускаем и настраиваем", desc: "Внедряем за 7–14 дней. Вы получаете готовое решение, а не \"разработку ради разработки\"" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                        <Icon name={item.icon} size={18} className="text-white" />
                      </div>
                      {i < 3 && <div className="w-px h-6 bg-violet-500/20" />}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-violet-500">{item.step}</span>
                        <h3 className="font-oswald text-base font-semibold text-white">{item.title}</h3>
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            {/* Кейсы */}
            <AnimatedSection>
              <div className="space-y-5">
                <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-emerald-300 border border-emerald-500/30 mb-2">
                  Примеры результатов
                </div>

                {[
                  {
                    icon: "Zap",
                    gradient: "from-violet-600 to-purple-600",
                    tag: "Автоматизация",
                    title: "Время ответа с 2 часов до 5 минут",
                    desc: "Настроили автоматическую обработку заявок с сайта — клиент получает ответ мгновенно, менеджер видит уведомление в Telegram.",
                    metrics: [
                      { label: "Было", val: "2 часа", color: "text-red-400" },
                      { label: "Стало", val: "5 минут", color: "text-emerald-400" },
                    ],
                  },
                  {
                    icon: "Link2",
                    gradient: "from-cyan-500 to-blue-600",
                    tag: "Интеграция",
                    title: "Убрали потерю заявок и ручной труд",
                    desc: "Интегрировали сайт с CRM — все заявки автоматически попадают в систему, менеджеры больше не копируют данные вручную.",
                    metrics: [
                      { label: "Потери", val: "0%", color: "text-emerald-400" },
                      { label: "Ручной труд", val: "−80%", color: "text-cyan-400" },
                    ],
                  },
                ].map((item, i) => (
                  <div key={i} className="glass neon-border rounded-2xl p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon name={item.icon} size={18} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{item.tag}</span>
                        </div>
                        <h4 className="font-oswald text-base font-semibold text-white">{item.title}</h4>
                      </div>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed mb-4">{item.desc}</p>
                    <div className="flex gap-4">
                      {item.metrics.map((m, j) => (
                        <div key={j} className="bg-white/5 rounded-xl px-4 py-2 text-center">
                          <div className={`font-oswald font-bold text-xl ${m.color}`}>{m.val}</div>
                          <div className="text-xs text-white/40">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Почему MAT Labs */}
                <div className="glass border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="Star" size={16} className="text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">Почему MAT Labs</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { icon: "Rocket", text: "Быстрый запуск — от 7 дней" },
                      { icon: "Settings", text: "Решения под задачи вашего бизнеса, а не шаблоны" },
                      { icon: "Target", text: "Фокус на результате, а не на процессе" },
                      { icon: "CheckCircle", text: "Простые и эффективные внедрения без лишней сложности" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <Icon name={item.icon} size={13} className="text-amber-400" />
                        </div>
                        <span className="text-sm text-white/70">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { ymGoal("cta_click", { source: "why_us" }); scrollTo("#contacts"); }}
                    className="mt-5 w-full glass border border-amber-500/30 hover:border-amber-500/60 py-3 rounded-xl text-sm font-semibold text-amber-300 hover:text-amber-200 transition-all flex items-center justify-center gap-2"
                  >
                    Получить бесплатный разбор
                    <Icon name="ArrowRight" size={15} />
                  </button>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </>
  );
}
