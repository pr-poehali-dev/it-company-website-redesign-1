import Icon from "@/components/ui/icon";
import { technologies, jobs, blogPosts, navLinks, AnimatedSection } from "@/components/shared";

interface BottomSectionsProps {
  scrollTo: (href: string) => void;
}

export default function BottomSections({ scrollTo }: BottomSectionsProps) {
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

      {/* BLOG */}
      <section id="blog" className="py-24 relative">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-amber-300 border border-amber-500/30 mb-6">
              Блог
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
              Делимся{" "}
              <span className="gradient-text">экспертизой</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Статьи, кейсы и технические разборы от наших инженеров</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {blogPosts.map((post, i) => (
              <AnimatedSection key={i}>
                <div className="glass neon-border rounded-2xl overflow-hidden card-hover group cursor-pointer h-full flex flex-col">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${post.color}`} />
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                      <span className="text-white/30 text-xs">{post.read} чтения</span>
                    </div>
                    <h3 className="font-oswald text-lg font-semibold mb-3 text-white leading-snug flex-1">{post.title}</h3>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-white/40 text-xs">{post.date}</span>
                      <div className="flex items-center gap-1 text-violet-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Читать</span>
                        <Icon name="ArrowRight" size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-10">
            <button className="glass border border-white/20 px-8 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 text-sm font-semibold">
              Все статьи
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/50 via-purple-900/50 to-indigo-900/50" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl animate-float-reverse" />
        <AnimatedSection>
          <div className="max-w-4xl mx-auto px-6 text-center relative">
            <h2 className="font-oswald text-4xl md:text-6xl font-bold mb-6">
              Готовы запустить{" "}
              <span className="gradient-text">следующий проект?</span>
            </h2>
            <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
              Оставьте заявку — наш менеджер свяжется с вами в течение 2 часов
            </p>
            <button
              onClick={() => scrollTo("#contacts")}
              className="btn-gradient px-10 py-5 rounded-2xl text-lg font-semibold text-white glow-purple"
            >
              <span>Обсудить проект бесплатно</span>
            </button>
          </div>
        </AnimatedSection>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
              Контакты
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
              Начнём{" "}
              <span className="gradient-text">прямо сейчас</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Расскажите о вашем проекте — мы предложим оптимальное решение</p>
          </AnimatedSection>

          <div className="grid lg:grid-cols-2 gap-12">
            <AnimatedSection>
              <div className="glass neon-border rounded-3xl p-8">
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Имя *</label>
                      <input
                        type="text"
                        placeholder="Иван Иванов"
                        className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Компания</label>
                      <input
                        type="text"
                        placeholder="ООО «Рога и Копыта»"
                        className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Email *</label>
                    <input
                      type="email"
                      placeholder="ivan@company.ru"
                      className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Телефон</label>
                    <input
                      type="tel"
                      placeholder="+7 (999) 000-00-00"
                      className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Расскажите о проекте *</label>
                    <textarea
                      rows={4}
                      placeholder="Опишите задачу, бюджет, сроки..."
                      className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm resize-none"
                    />
                  </div>
                  <button className="btn-gradient w-full py-4 rounded-2xl font-semibold text-white text-base glow-purple">
                    <span className="flex items-center justify-center gap-2">
                      Отправить заявку
                      <Icon name="Send" size={18} />
                    </span>
                  </button>
                  <p className="text-center text-white/30 text-xs">
                    Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div className="space-y-6">
                {[
                  { icon: "MapPin", title: "Офис", value: "Москва, Пресненская наб., 12, БЦ «Башня Федерация»", color: "text-violet-400", bg: "bg-violet-500/20" },
                  { icon: "Phone", title: "Телефон", value: "+7 (927) 748-68-68", color: "text-cyan-400", bg: "bg-cyan-500/20" },
                  { icon: "Mail", title: "Email", value: "maksT77@yandex.ru", color: "text-pink-400", bg: "bg-pink-500/20" },
                  { icon: "Clock", title: "Часы работы", value: "Пн–Пт: 9:00–19:00 МСК", color: "text-emerald-400", bg: "bg-emerald-500/20" },
                ].map((item, i) => (
                  <div key={i} className="glass neon-border rounded-2xl p-5 flex items-start gap-4 card-hover">
                    <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon name={item.icon} size={20} className={item.color} />
                    </div>
                    <div>
                      <div className="text-white/50 text-xs mb-1">{item.title}</div>
                      <div className="text-white font-medium text-sm">{item.value}</div>
                    </div>
                  </div>
                ))}

                <div className="glass neon-border rounded-2xl p-5">
                  <div className="text-white/50 text-xs mb-3">Мы в соцсетях</div>
                  <div className="flex gap-3">
                    {[
                      { icon: "MessageCircle", label: "Telegram" },
                      { icon: "Linkedin", label: "LinkedIn" },
                      { icon: "Github", label: "GitHub" },
                      { icon: "Youtube", label: "YouTube" },
                    ].map((s, i) => (
                      <button
                        key={i}
                        title={s.label}
                        className="w-10 h-10 glass border border-white/10 rounded-xl flex items-center justify-center hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-200 group"
                      >
                        <Icon name={s.icon} size={16} className="text-white/50 group-hover:text-violet-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
                <span className="relative z-10 text-white font-oswald font-bold text-xs">МЛ</span>
              </div>
              <span className="font-oswald font-bold text-lg gradient-text">МАТ-Лабс</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
              {navLinks.map(link => (
                <button key={link.href} onClick={() => scrollTo(link.href)} className="hover:text-white transition-colors">
                  {link.label}
                </button>
              ))}
            </div>
            <div className="text-white/30 text-sm text-center">
              © 2026 ООО МАТ-Лабс. Все права защищены
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}