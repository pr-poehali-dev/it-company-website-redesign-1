import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/053716bd-a6b1-4c7b-bb56-c4218a6b6df9.jpg";
const TEAM_IMAGE = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/2e70f386-3160-4664-86d9-a294fc4658a1.jpg";
const PORTFOLIO_IMAGE = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/31da4818-f15a-431d-9e25-4c9cd5a4e254.jpg";

const navLinks = [
  { label: "Главная", href: "#hero" },
  { label: "О компании", href: "#about" },
  { label: "Услуги", href: "#services" },
  { label: "Портфолио", href: "#portfolio" },
  { label: "Технологии", href: "#technologies" },
  { label: "Карьера", href: "#career" },
  { label: "Блог", href: "#blog" },
  { label: "Контакты", href: "#contacts" },
];

const services = [
  { icon: "Code2", title: "Разработка ПО", desc: "Создаём масштабируемые веб и мобильные приложения с нуля до запуска", color: "from-violet-500 to-purple-600" },
  { icon: "Cloud", title: "Облачные решения", desc: "Миграция в облако, DevOps, Kubernetes, CI/CD и автоматизация инфраструктуры", color: "from-cyan-500 to-blue-600" },
  { icon: "Brain", title: "ИИ и ML", desc: "Нейросети, компьютерное зрение, NLP и предиктивная аналитика для вашего бизнеса", color: "from-pink-500 to-rose-600" },
  { icon: "Shield", title: "Кибербезопасность", desc: "Аудит, пентест, защита данных и соответствие требованиям GDPR и 152-ФЗ", color: "from-emerald-500 to-teal-600" },
  { icon: "BarChart3", title: "Аналитика данных", desc: "BI-решения, дашборды, ETL-пайплайны и Data Warehouse под ваши KPI", color: "from-orange-500 to-amber-600" },
  { icon: "Smartphone", title: "Мобильные приложения", desc: "iOS и Android нативные и кросс-платформенные решения на React Native и Flutter", color: "from-indigo-500 to-blue-600" },
];

const portfolio = [
  { title: "FinTech Платформа", category: "Банкинг", desc: "Цифровой банк для 2М+ пользователей с AI-скорингом и real-time аналитикой", tech: ["React", "Python", "ML"], color: "from-violet-600 to-indigo-600" },
  { title: "MedTech Система", category: "Медицина", desc: "Платформа телемедицины с распознаванием диагнозов по снимкам и ЭЭГ", tech: ["TensorFlow", "React Native", "AWS"], color: "from-cyan-600 to-blue-600" },
  { title: "E-Commerce Hub", category: "Ритейл", desc: "Маркетплейс с ML-рекомендациями, обработкой 10K+ заказов в минуту", tech: ["Node.js", "Kafka", "PostgreSQL"], color: "from-pink-600 to-rose-600" },
  { title: "SmartCity Dashboard", category: "ГосТех", desc: "Единая платформа управления городской инфраструктурой для 5 мегаполисов", tech: ["Vue.js", "IoT", "Kubernetes"], color: "from-emerald-600 to-teal-600" },
  { title: "LogiTech Platform", category: "Логистика", desc: "Оптимизация маршрутов с ИИ, снижение затрат на 35% для топ-10 перевозчиков", tech: ["Python", "GraphQL", "Redis"], color: "from-orange-600 to-amber-600" },
  { title: "EduTech Экосистема", category: "EdTech", desc: "Адаптивное обучение с персонализированными траекториями для 500K+ студентов", tech: ["React", "FastAPI", "NLP"], color: "from-purple-600 to-pink-600" },
];

const technologies = [
  { name: "React", icon: "⚛️", category: "Frontend" },
  { name: "Python", icon: "🐍", category: "Backend" },
  { name: "TypeScript", icon: "📘", category: "Frontend" },
  { name: "Kubernetes", icon: "☸️", category: "DevOps" },
  { name: "PostgreSQL", icon: "🐘", category: "Database" },
  { name: "TensorFlow", icon: "🧠", category: "AI/ML" },
  { name: "Docker", icon: "🐳", category: "DevOps" },
  { name: "AWS", icon: "☁️", category: "Cloud" },
  { name: "GraphQL", icon: "◈", category: "API" },
  { name: "Redis", icon: "🔴", category: "Database" },
  { name: "Kafka", icon: "📨", category: "Backend" },
  { name: "Flutter", icon: "💙", category: "Mobile" },
];

const jobs = [
  { title: "Senior Frontend Developer", dept: "Engineering", type: "Удалённо", salary: "от 250 000 ₽" },
  { title: "ML Engineer", dept: "AI/ML", type: "Гибрид", salary: "от 300 000 ₽" },
  { title: "DevOps Engineer", dept: "Infrastructure", type: "Офис/Гибрид", salary: "от 280 000 ₽" },
  { title: "Product Designer", dept: "Design", type: "Удалённо", salary: "от 200 000 ₽" },
];

const blogPosts = [
  { title: "Как мы обучили GPT-модель на корпоративных данных за 2 недели", date: "8 апреля 2026", tag: "AI/ML", read: "8 мин", color: "from-violet-500 to-purple-600" },
  { title: "Kubernetes + FinTech: надёжность 99.999% в production", date: "2 апреля 2026", tag: "DevOps", read: "12 мин", color: "from-cyan-500 to-blue-600" },
  { title: "React Server Components: мы перешли и вот что вышло", date: "28 марта 2026", tag: "Frontend", read: "6 мин", color: "from-pink-500 to-rose-600" },
];

function useIntersectionObserver(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useIntersectionObserver();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [counter, setCounter] = useState({ projects: 0, years: 0, clients: 0, team: 0 });
  const statsRef = useRef<HTMLDivElement>(null);
  const statsAnimated = useRef(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsAnimated.current) {
          statsAnimated.current = true;
          animateCounters();
        }
      },
      { threshold: 0.5 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  function animateCounters() {
    const duration = 2000;
    const targets = { projects: 200, years: 12, clients: 98, team: 50 };
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounter({
        projects: Math.floor(ease * targets.projects),
        years: Math.floor(ease * targets.years),
        clients: Math.floor(ease * targets.clients),
        team: Math.floor(ease * targets.team),
      });
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function scrollTo(href: string) {
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "glass border-b border-white/10 py-3" : "py-5"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg btn-gradient flex items-center justify-center">
              <span className="relative z-10 text-white font-oswald font-bold text-sm">NT</span>
            </div>
            <span className="font-oswald font-bold text-xl tracking-wider gradient-text">NexaTech</span>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex">
            <button
              onClick={() => scrollTo("#contacts")}
              className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            >
              <span>Связаться</span>
            </button>
          </div>

          <button className="lg:hidden p-2 rounded-lg glass" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? "X" : "Menu"} size={22} />
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden glass border-t border-white/10 mt-2 mx-4 rounded-2xl p-4">
            {navLinks.map(link => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="w-full text-left px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 text-sm"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("#contacts")}
              className="btn-gradient w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white"
            >
              <span>Связаться с нами</span>
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="hero" className="w-full h-full object-cover opacity-20" />
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
                { val: `${counter.years} лет`, label: "На рынке" },
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
                <img src={TEAM_IMAGE} alt="Команда NexaTech" className="relative rounded-3xl w-full object-cover aspect-[4/3] neon-border" />
                <div className="absolute -bottom-6 -right-6 glass neon-border rounded-2xl p-5 animate-float">
                  <div className="font-oswald text-3xl font-bold gradient-text">12+</div>
                  <div className="text-white/60 text-sm">лет инноваций</div>
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
                  NexaTech — это команда из 50+ инженеров, дизайнеров и аналитиков,
                  которые превращают смелые бизнес-идеи в работающие цифровые продукты.
                </p>
                <p className="text-white/50 leading-relaxed mb-8">
                  С 2014 года мы реализовали более 200 проектов в финтехе, медицине,
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
                <div className="glass neon-border rounded-2xl p-6 card-hover group cursor-pointer h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon name={s.icon} size={22} className="text-white" />
                  </div>
                  <h3 className="font-oswald text-xl font-semibold mb-3 text-white">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-violet-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Подробнее</span>
                    <Icon name="ArrowRight" size={14} />
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
            <div className="relative rounded-3xl overflow-hidden neon-border glass card-hover">
              <img src={PORTFOLIO_IMAGE} alt="portfolio" className="w-full h-64 md:h-80 object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080812] via-[#080812]/70 to-transparent flex items-center">
                <div className="p-8 md:p-12 max-w-lg">
                  <span className="inline-block bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full mb-4">Флагманский проект</span>
                  <h3 className="font-oswald text-3xl md:text-4xl font-bold mb-3">NexaBank 3.0</h3>
                  <p className="text-white/60 mb-4">Крупнейший цифровой банк СНГ — 8М+ пользователей, AI-рекомендации, zero-downtime деплой</p>
                  <div className="flex gap-2 flex-wrap">
                    {["React", "Kubernetes", "ML", "Real-time"].map(t => (
                      <span key={t} className="glass border border-white/10 text-white/70 text-xs px-3 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((p, i) => (
              <AnimatedSection key={i}>
                <div className="glass neon-border rounded-2xl p-6 card-hover group cursor-pointer h-full">
                  <div className={`h-2 w-full rounded-full bg-gradient-to-r ${p.color} mb-5`} />
                  <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${p.color} text-white font-medium`}>{p.category}</span>
                  <h3 className="font-oswald text-lg font-semibold mt-3 mb-2 text-white">{p.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">{p.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {p.tech.map(t => (
                      <span key={t} className="glass border border-white/10 text-white/60 text-xs px-2 py-1 rounded-lg">{t}</span>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

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
                  { icon: "Phone", title: "Телефон", value: "+7 (800) 100-00-00", color: "text-cyan-400", bg: "bg-cyan-500/20" },
                  { icon: "Mail", title: "Email", value: "hello@nexatech.ru", color: "text-pink-400", bg: "bg-pink-500/20" },
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
                <span className="relative z-10 text-white font-oswald font-bold text-xs">NT</span>
              </div>
              <span className="font-oswald font-bold text-lg gradient-text">NexaTech</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
              {navLinks.map(link => (
                <button key={link.href} onClick={() => scrollTo(link.href)} className="hover:text-white transition-colors">
                  {link.label}
                </button>
              ))}
            </div>
            <div className="text-white/30 text-sm text-center">
              © 2026 NexaTech. Все права защищены
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
