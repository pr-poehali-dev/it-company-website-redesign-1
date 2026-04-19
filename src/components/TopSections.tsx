import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { HERO_IMAGE, TEAM_IMAGE, PORTFOLIO_IMAGE, services, portfolio, AnimatedSection } from "@/components/shared";

interface TopSectionsProps {
  scrollTo: (href: string) => void;
  counter: { projects: number; years: number; clients: number; team: number };
  statsRef: React.RefObject<HTMLDivElement>;
}

export default function TopSections({ scrollTo, counter, statsRef }: TopSectionsProps) {
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
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 border border-violet-500/30 animate-fade-in-up">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-white/80">Топ-10 IT-компаний России 2026</span>
            </div>

            <h1 className="font-oswald text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-6 animate-fade-in-up delay-100">
              <span className="block text-white">Технологии,</span>
              <span className="block gradient-text">которые меняют</span>
              <span className="block text-white">бизнес</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed mb-10 animate-fade-in-up delay-200">
              Разрабатываем цифровые продукты мирового уровня — от стартапа до корпорации.
              ИИ, облака, кибербезопасность и полный цикл разработки под ключ.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
              <button
                onClick={() => scrollTo("#services")}
                className="btn-gradient px-8 py-4 rounded-2xl text-base font-semibold text-white glow-purple group"
              >
                <span className="flex items-center gap-2">
                  Наши услуги
                  <Icon name="ArrowRight" size={18} />
                </span>
              </button>
              <button
                onClick={() => scrollTo("#portfolio")}
                className="glass px-8 py-4 rounded-2xl text-base font-semibold text-white hover:bg-white/10 transition-all duration-300 border border-white/20"
              >
                Портфолио
              </button>
            </div>

            <div ref={statsRef} className="flex flex-wrap gap-10 mt-16 animate-fade-in-up delay-400">
              {[
                { val: `${counter.projects}+`, label: "Проектов" },
                { val: `${counter.years}`, label: "Год основания" },
                { val: `${counter.clients}%`, label: "Довольных клиентов" },
                { val: `${counter.team}+`, label: "Специалистов" },
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

      {/* ABOUT */}
      <section id="about" className="py-24 relative">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-3xl blur-xl" />
                <img src={TEAM_IMAGE} alt="Команда МАТ-Лабс — 50+ IT-специалистов и инженеров" className="relative rounded-3xl w-full object-cover aspect-[4/3] neon-border" />
                <div className="absolute -bottom-6 -right-6 glass neon-border rounded-2xl p-5 animate-float">
                  <div className="font-oswald text-3xl font-bold gradient-text">2026</div>
                  <div className="text-white/60 text-sm">год основания</div>
                </div>
                <div className="absolute -top-6 -left-6 glass neon-border rounded-2xl p-4 animate-float-reverse">
                  <div className="flex items-center gap-2">
                    <Icon name="Award" size={20} className="text-amber-400" />
                    <span className="text-sm font-semibold">TOP-10</span>
                  </div>
                  <div className="text-white/50 text-xs">IT-компаний РФ</div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div>
                <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
                  О компании
                </div>
                <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Мы строим{" "}
                  <span className="gradient-text">цифровое будущее</span>{" "}
                  вместе с вами
                </h2>
                <p className="text-white/60 text-lg leading-relaxed mb-6">
                  МАТ-Лабс — это команда из 50+ инженеров, дизайнеров и аналитиков,
                  которые превращают смелые бизнес-идеи в работающие цифровые продукты.
                </p>
                <p className="text-white/50 leading-relaxed mb-8">
                  С 2026 года мы реализуем проекты в финтехе, медицине,
                  ритейле и государственном секторе.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: "Target", text: "Фокус на результат" },
                    { icon: "Zap", text: "Agile-разработка" },
                    { icon: "Users", text: "Dedicated-команды" },
                    { icon: "Globe", text: "Международный опыт" },
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
              Полный спектр{" "}
              <span className="gradient-text-3">IT-решений</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">От идеи до запуска — всё в одном месте</p>
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
              Проекты, которыми{" "}
              <span className="gradient-text-2">мы гордимся</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">200+ реализованных решений для компаний из разных отраслей</p>
          </AnimatedSection>

          <AnimatedSection className="mb-6">
            <a href="https://avangard-ai.ru" target="_blank" rel="noopener noreferrer" className="block">
            <div className="relative rounded-3xl overflow-hidden neon-border glass card-hover">
              <img src={PORTFOLIO_IMAGE} alt="Проект АВАНГАРД — ИИ-эксперт по дизайну и ремонту интерьера" className="w-full h-64 md:h-80 object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080812] via-[#080812]/70 to-transparent flex items-center">
                <div className="p-8 md:p-12 max-w-lg">
                  <span className="inline-block bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full mb-4">Флагманский проект</span>
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
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                  <div className="glass neon-border rounded-2xl p-6 card-hover group cursor-pointer h-full">
                    <div className={`h-2 w-full rounded-full bg-gradient-to-r ${p.color} mb-5`} />
                    <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${p.color} text-white font-medium`}>{p.category}</span>
                    <h3 className="font-oswald text-lg font-semibold mt-3 mb-2 text-white">{p.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-4">{p.desc}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex gap-2 flex-wrap">
                        {p.tech.map(t => (
                          <span key={t} className="glass border border-white/10 text-white/60 text-xs px-2 py-1 rounded-lg">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-violet-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
                        <span>Открыть</span>
                        <Icon name="ExternalLink" size={12} />
                      </div>
                    </div>
                  </div>
                </a>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}