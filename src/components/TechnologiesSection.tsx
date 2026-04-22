import Icon from "@/components/ui/icon";
import { technologies, jobs, AnimatedSection } from "@/components/shared";

interface TechnologiesSectionProps {
  scrollTo: (href: string) => void;
}

export default function TechnologiesSection({ scrollTo }: TechnologiesSectionProps) {
  return (
    <>
      {/* TECHNOLOGIES */}
      <section id="technologies" className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-emerald-300 border border-emerald-500/30 mb-6">
              Технологии
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
              Наш технологический{" "}
              <span className="gradient-text">стек</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Используем только проверенные и актуальные технологии</p>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-20">
            {technologies.map((tech, i) => (
              <AnimatedSection key={i}>
                <div className="glass neon-border rounded-2xl p-4 text-center card-hover group cursor-pointer">
                  <div className="text-3xl mb-2 group-hover:scale-125 transition-transform duration-300">{tech.icon}</div>
                  <div className="font-semibold text-sm text-white mb-1">{tech.name}</div>
                  <div className="text-white/40 text-xs">{tech.category}</div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection>
            <h3 className="font-oswald text-3xl font-bold text-center mb-12">
              Как мы <span className="gradient-text">работаем</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { step: "01", title: "Анализ", icon: "Search" },
                { step: "02", title: "Дизайн", icon: "Palette" },
                { step: "03", title: "Разработка", icon: "Code2" },
                { step: "04", title: "Тестирование", icon: "CheckCircle" },
                { step: "05", title: "Запуск", icon: "Rocket" },
              ].map((item, i) => (
                <div key={i} className="glass neon-border rounded-2xl p-5 text-center group hover:border-violet-500/50 transition-all duration-300">
                  <div className="font-oswald text-4xl font-bold gradient-text opacity-30 mb-2">{item.step}</div>
                  <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-violet-500/40 transition-all">
                    <Icon name={item.icon} size={18} className="text-violet-400" />
                  </div>
                  <div className="font-semibold text-sm">{item.title}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CAREER */}
      <section id="career" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-950/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-pink-300 border border-pink-500/30 mb-6">
                Карьера
              </div>
              <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Присоединяйся к{" "}
                <span className="gradient-text-2">команде мечты</span>
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-6">
                Мы ищем лучших — тех, кто горит технологиями и хочет делать
                продукты, которыми пользуются миллионы.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Конкурентная зарплата + бонусы",
                  "Удалённая работа или гибридный формат",
                  "Обучение и конференции за счёт компании",
                  "Акции компании (ESOP) для ключевых сотрудников",
                  "ДМС + психологическая поддержка",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                      <Icon name="Check" size={12} className="text-white" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div className="space-y-4">
                {jobs.map((job, i) => (
                  <div key={i} className="glass neon-border rounded-2xl p-5 card-hover group cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-oswald text-lg font-semibold mb-2 text-white">{job.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="glass border border-white/10 text-white/60 text-xs px-2 py-1 rounded-lg">{job.dept}</span>
                          <span className="glass border border-emerald-500/30 text-emerald-400 text-xs px-2 py-1 rounded-lg">{job.type}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-violet-400 font-semibold text-sm">{job.salary}</div>
                        <div className="w-8 h-8 glass rounded-xl flex items-center justify-center mt-2 ml-auto group-hover:bg-violet-500/20 transition-all">
                          <Icon name="ArrowRight" size={14} className="text-violet-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => scrollTo("#contacts")}
                  className="btn-gradient w-full py-4 rounded-2xl font-semibold text-white"
                >
                  <span>Смотреть все вакансии</span>
                </button>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </>
  );
}
