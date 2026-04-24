import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";

const segments = [
  {
    icon: "Building2",
    gradient: "from-violet-600 to-purple-600",
    title: "Малому и среднему бизнесу",
    desc: "Если в компании много ручных процессов, заявки обрабатываются вручную и сотрудники тратят время на рутину.",
  },
  {
    icon: "Rocket",
    gradient: "from-cyan-500 to-blue-600",
    title: "Онлайн-сервисам и стартапам",
    desc: "Если нужен сайт, веб-сервис или MVP для запуска продукта быстро и без лишних затрат.",
  },
  {
    icon: "MessageCircle",
    gradient: "from-emerald-500 to-teal-600",
    title: "Компаниям с большим потоком заявок",
    desc: "Если важно быстрее отвечать клиентам и не терять ни одного обращения.",
  },
  {
    icon: "GitBranch",
    gradient: "from-orange-500 to-amber-600",
    title: "Бизнесам с разрозненными системами",
    desc: "Если нужно связать CRM, формы, таблицы и сервисы в одну автоматическую систему.",
  },
];

export default function AudienceSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  return (
    <section id="audience" className="py-24 relative">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-cyan-300 border border-cyan-500/30 mb-6">
            Для кого
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Кому подойдут{" "}
            <span className="gradient-text-3">наши решения</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Узнайте себя — и оставьте заявку на бесплатный разбор
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {segments.map((s, i) => (
            <AnimatedSection key={i}>
              <div className="glass neon-border rounded-2xl p-7 card-hover flex gap-5 group h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon name={s.icon} size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Блок «Примеры задач» */}
        <AnimatedSection>
          <div className="glass neon-border rounded-2xl p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-5">
                  <Icon name="ListChecks" size={14} className="text-violet-400" />
                  Примеры задач
                </div>
                <h3 className="font-oswald text-2xl md:text-3xl font-bold text-white mb-4">
                  Что мы уже{" "}
                  <span className="gradient-text">решали</span>
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Это реальные задачи наших клиентов — возможно, одна из них похожа на вашу.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: "Inbox", text: "Автоматическая обработка заявок с сайта" },
                  { icon: "Link2", text: "Интеграция сайта с CRM-системой" },
                  { icon: "Bell", text: "Уведомления менеджеров о новых лидах" },
                  { icon: "FileText", text: "Автоматическое создание отчётов" },
                  { icon: "HeadphonesIcon", text: "Автоматизация обработки обращений клиентов" },
                  { icon: "Globe", text: "Создание лендингов для привлечения клиентов" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon name={item.icon} size={14} className="text-violet-400" />
                    </div>
                    <span className="text-sm text-white/75">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
