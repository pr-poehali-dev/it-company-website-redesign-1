import { useNavigate } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { HERO_IMAGE, TEAM_IMAGE, PORTFOLIO_IMAGE, services, portfolio, AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";
import PortfolioCard from "@/components/PortfolioCard";
import AutomateSection from "@/components/AutomateSection";

interface TopSectionsProps {
  scrollTo: (href: string) => void;
  statsRef: React.RefObject<HTMLDivElement | null>;
}

export default function TopSections({ scrollTo, statsRef }: TopSectionsProps) {
  const navigate = useNavigate();
  return (
    <>
      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="МАТ-Лабс — инновационные IT-решения для бизнеса" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080812]/60 via-transparent to-[#080812]" />
          <div className="absolute inset-0 animated-gradient opacity-70" />
          <div className="absolute inset-0 grid-bg" />
        </div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-float-reverse" />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 border border-cyan-500/30 animate-fade-in-up">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-white/80">Автоматизация для малого и среднего бизнеса</span>
            </div>

            <h1 className="font-oswald text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.0] mb-6 animate-fade-in-up delay-100">
              <span className="block text-white">Автоматизируем</span>
              <span className="block gradient-text">рутину в бизнесе</span>
              <span className="block text-white">с помощью AI</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed mb-4 animate-fade-in-up delay-200">
              Заявки, ответы клиентам, CRM, документы и отчёты — то, что сотрудники
              сейчас делают вручную. Начинаем с бесплатной консультации.
            </p>

            <div className="flex flex-wrap gap-4 mb-4 animate-fade-in-up delay-300">
              <button
                onClick={() => { ymGoal("cta_click", { source: "hero" }); scrollTo("#contacts"); }}
                className="btn-gradient px-8 py-4 rounded-2xl text-base font-semibold text-white glow-purple group"
              >
                <span className="flex items-center gap-2">
                  Бесплатная консультация
                  <Icon name="ArrowRight" size={18} />
                </span>
              </button>
              <button
                onClick={() => { ymGoal("cta_click", { source: "hero_what" }); scrollTo("#what-we-do"); }}
                className="glass px-8 py-4 rounded-2xl text-base font-semibold text-white hover:bg-white/10 transition-all duration-300 border border-white/20"
              >
                Что можно автоматизировать
              </button>
            </div>

            <p className="text-sm text-white/35 mb-12 animate-fade-in-up delay-300">
              30–45 минут онлайн. Разберём ваши процессы и скажем, что стоит автоматизировать, а что нет
            </p>

            <div ref={statsRef} className="flex flex-wrap gap-10 animate-fade-in-up delay-400">
              {[
                { val: "0 ₽", label: "Первая консультация" },
                { val: "от 30 тыс. ₽", label: "Пробный проект" },
                { val: "12", label: "Своих работающих сервисов" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="font-oswald text-3xl md:text-4xl font-bold gradient-text">{s.val}</div>
                  <div className="text-white/50 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-white/30 text-xs">Скролл</span>
          <Icon name="ChevronDown" size={20} className="text-white/30" />
        </div>
      </section>

      <AutomateSection scrollTo={scrollTo} />

      {/* ABOUT */}
      <section id="about" className="py-24 relative">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-3xl blur-xl" />
                <img src={TEAM_IMAGE} alt="Команда МАТ-Лабс — разработка и внедрение AI-решений" loading="lazy" className="relative rounded-3xl w-full object-cover aspect-[4/3] neon-border" />
                <div className="absolute -bottom-6 -right-6 glass neon-border rounded-2xl p-5 animate-float">
                  <div className="font-oswald text-3xl font-bold gradient-text">12</div>
                  <div className="text-white/60 text-sm">своих сервисов в работе</div>
                </div>
                <div className="absolute -top-6 -left-6 glass neon-border rounded-2xl p-4 animate-float-reverse">
                  <div className="flex items-center gap-2">
                    <Icon name="Handshake" size={20} className="text-amber-400" />
                    <span className="text-sm font-semibold">Лемана Про</span>
                  </div>
                  <div className="text-white/50 text-xs">официальный партнёр</div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div>
                <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
                  О компании
                </div>
                <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Мы делаем то,{" "}
                  <span className="gradient-text">чем пользуемся сами</span>
                </h2>
                <p className="text-white/60 text-lg leading-relaxed mb-6">
                  МАТ-Лабс — команда разработчиков из Самары. Мы создали и поддерживаем 12 собственных
                  сервисов: для ремонта, CRM, обучения, рассылок, грантов. Тот же опыт применяем в проектах клиентов.
                </p>
                <p className="text-white/50 leading-relaxed mb-8">
                  Начинаем с одной задачи и небольшого бюджета. Если результат вас устроил — продолжаем.
                  Если нет — вы не потратили лишнего.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: "Package", text: "12 своих сервисов" },
                    { icon: "Handshake", text: "Партнёр Лемана Про" },
                    { icon: "Globe", text: "Работаем по всей России" },
                    { icon: "FileText", text: "Работаем по договору" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 glass rounded-xl p-3 border border-white/5">
                      <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name={item.icon} size={16} className="text-violet-400" />
                      </div>
                      <span className="text-sm text-white/80">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-cyan-300 border border-cyan-500/30 mb-6">
              Услуги
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
              Услуги{" "}
              <span className="gradient-text-3">и цены</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Цены указаны «от». Точную стоимость назовём после консультации и зафиксируем в договоре</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <AnimatedSection key={i}>
                <div
                  className="glass neon-border rounded-2xl p-6 card-hover group cursor-pointer h-full flex flex-col"
                  onClick={() => navigate(`/services/${s.slug}`)}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon name={s.icon} size={22} className="text-white" />
                  </div>
                  <h3 className="font-oswald text-xl font-semibold mb-3 text-white">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed flex-1">{s.desc}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white/90">{s.price}</span>
                    <div className="flex items-center gap-1.5 text-violet-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>Подробнее</span>
                      <Icon name="ArrowRight" size={14} />
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="mt-8">
            <div className="glass neon-border rounded-2xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-transparent to-cyan-600/10" />
              <div className="relative flex flex-col lg:flex-row gap-8 lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full text-xs text-emerald-300 border border-emerald-500/30 mb-4">
                    <Icon name="RefreshCw" size={12} />
                    После запуска
                  </div>
                  <h3 className="font-oswald text-2xl md:text-3xl font-bold text-white mb-3">
                    Абонентское сопровождение
                  </h3>
                  <p className="text-white/50 text-sm md:text-base leading-relaxed mb-5">
                    После запуска система требует внимания: меняются сервисы, появляются новые задачи.
                    Мы следим, чтобы всё работало, и дорабатываем по вашим запросам.
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {[
                      "Доработки каждый месяц",
                      "Контроль интеграций",
                      "Приоритетная реакция на сбои",
                      "Отчёт по метрикам",
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                          <Icon name="Check" size={10} className="text-white" />
                        </div>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 lg:text-right">
                  <div className="font-oswald text-3xl md:text-4xl font-bold gradient-text mb-1">
                    от 30 000 ₽
                  </div>
                  <div className="text-white/40 text-sm mb-5">в месяц</div>
                  <button
                    onClick={() => { ymGoal("cta_click", { source: "retainer" }); scrollTo("#contacts"); }}
                    className="btn-gradient px-7 py-3 rounded-xl text-sm font-semibold text-white glow-purple whitespace-nowrap"
                  >
                    Обсудить сопровождение
                  </button>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section id="portfolio" className="py-24 relative">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-pink-300 border border-pink-500/30 mb-6">
              Портфолио
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
              Наши{" "}
              <span className="gradient-text-2">сервисы</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Всё это мы сделали и поддерживаем сами. Каждый можно открыть и посмотреть</p>
          </AnimatedSection>

          <AnimatedSection className="mb-6">
            <a href="https://avangard-ai.ru" target="_blank" rel="noopener noreferrer" className="block">
            <div className="relative rounded-3xl overflow-hidden neon-border glass card-hover">
              <img src={PORTFOLIO_IMAGE} alt="Проект АВАНГАРД — ИИ-эксперт по дизайну и ремонту интерьера" loading="lazy" className="w-full h-64 md:h-80 object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080812] via-[#080812]/70 to-transparent flex items-center">
                <div className="p-8 md:p-12 max-w-lg">
                  <span className="inline-block bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full mb-4">Наш главный проект</span>
                  <h3 className="font-oswald text-3xl md:text-4xl font-bold mb-3">АВАНГАРД</h3>
                  <p className="text-white/60 mb-4">ИИ-эксперт по дизайну и ремонту: онлайн-консультации, создание дизайн-проектов интерьера и расчёт сметы</p>
                  <div className="flex gap-2 flex-wrap">
                    {["AI", "React", "Python", "ML"].map(t => (
                      <span key={t} className="glass border border-white/10 text-white/70 text-xs px-3 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </a>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((p, i) => (
              <AnimatedSection key={i}>
                <PortfolioCard p={p} />
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="mt-8">
            <button
              onClick={() => { ymGoal("cta_click", { source: "portfolio_turnkey" }); navigate("/gotovyy-biznes"); }}
              className="w-full text-left glass neon-border rounded-2xl p-6 md:p-8 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/15 via-transparent to-cyan-600/15" />
              <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <Icon name="Rocket" size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-oswald text-xl md:text-2xl font-bold text-white">Хотите такой же проект в своём городе?</h3>
                    <p className="text-white/55 text-sm">Готовый бизнес под ключ: запуск под вашим брендом от 250 000 ₽ и сопровождение</p>
                  </div>
                </div>
                <span className="btn-gradient px-6 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2 self-start md:self-auto whitespace-nowrap">
                  Смотреть проекты
                  <Icon name="ArrowRight" size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </button>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}