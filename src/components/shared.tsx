import { useEffect, useRef, useState } from "react";

export const HERO_IMAGE = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/053716bd-a6b1-4c7b-bb56-c4218a6b6df9.jpg";
export const TEAM_IMAGE = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/2e70f386-3160-4664-86d9-a294fc4658a1.jpg";
export const PORTFOLIO_IMAGE = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/31da4818-f15a-431d-9e25-4c9cd5a4e254.jpg";

export const navLinks = [
  { label: "Главная", href: "#hero" },
  { label: "О компании", href: "#about" },
  { label: "Услуги", href: "#services" },
  { label: "Портфолио", href: "#portfolio" },
  { label: "Технологии", href: "#technologies" },
  { label: "Карьера", href: "#career" },
  { label: "Блог", href: "#blog" },
  { label: "Контакты", href: "#contacts" },
];

export const services = [
  { icon: "Code2", title: "Разработка ПО", desc: "Создаём масштабируемые веб и мобильные приложения с нуля до запуска", color: "from-violet-500 to-purple-600" },
  { icon: "Cloud", title: "Облачные решения", desc: "Миграция в облако, DevOps, Kubernetes, CI/CD и автоматизация инфраструктуры", color: "from-cyan-500 to-blue-600" },
  { icon: "Brain", title: "ИИ и ML", desc: "Нейросети, компьютерное зрение, NLP и предиктивная аналитика для вашего бизнеса", color: "from-pink-500 to-rose-600" },
  { icon: "Shield", title: "Кибербезопасность", desc: "Аудит, пентест, защита данных и соответствие требованиям GDPR и 152-ФЗ", color: "from-emerald-500 to-teal-600" },
  { icon: "BarChart3", title: "Аналитика данных", desc: "BI-решения, дашборды, ETL-пайплайны и Data Warehouse под ваши KPI", color: "from-orange-500 to-amber-600" },
  { icon: "Smartphone", title: "Мобильные приложения", desc: "iOS и Android нативные и кросс-платформенные решения на React Native и Flutter", color: "from-indigo-500 to-blue-600" },
];

export const portfolio = [
  { title: "АВАНГАРД", category: "ИИ / Дизайн", desc: "ИИ-эксперт по дизайну и ремонту: онлайн-консультации, создание дизайн-проектов интерьера и расчёт сметы", tech: ["AI", "React", "Python"], color: "from-violet-600 to-indigo-600", url: "https://avangard-ai.ru" },
  { title: "Купец в плюсе", category: "Бизнес-сервисы", desc: "Агрегатор бизнес-услуг, собирающий лучшие предложения от проверенных партнёров для развития бизнеса", tech: ["React", "Node.js", "PostgreSQL"], color: "from-cyan-600 to-blue-600", url: "https://купецвплюсе.рф" },
  { title: "AVT", category: "CRM / ИИ", desc: "Платформа автоматизации работы с клиентами: ИИ-звонки, email-рассылки и встроенная CRM-система", tech: ["AI", "Python", "FastAPI"], color: "from-pink-600 to-rose-600", url: "https://avt-63.ru" },
  { title: "БухКонтроль", category: "Бухгалтерия", desc: "Профессиональный бухгалтерский аутсорсинг для агробизнеса: учёт, налоговая оптимизация и консультации", tech: ["React", "Python", "PostgreSQL"], color: "from-emerald-600 to-teal-600", url: "https://bk-63.ru" },
  { title: "RoomScan AI", category: "ИИ / Недвижимость", desc: "ИИ-инструмент для сканирования и планировки помещений с автоматическим расчётом площади и материалов", tech: ["AI", "React", "ML"], color: "from-orange-600 to-amber-600", url: "https://roomscan-ai.ru" },
];

export const technologies = [
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

export const jobs = [
  { title: "Senior Frontend Developer", dept: "Engineering", type: "Удалённо", salary: "от 250 000 ₽" },
  { title: "ML Engineer", dept: "AI/ML", type: "Гибрид", salary: "от 300 000 ₽" },
  { title: "DevOps Engineer", dept: "Infrastructure", type: "Офис/Гибрид", salary: "от 280 000 ₽" },
  { title: "Product Designer", dept: "Design", type: "Удалённо", salary: "от 200 000 ₽" },
];

export const blogPosts = [
  { title: "Как мы обучили GPT-модель на корпоративных данных за 2 недели", date: "8 апреля 2026", tag: "AI/ML", read: "8 мин", color: "from-violet-500 to-purple-600" },
  { title: "Kubernetes + FinTech: надёжность 99.999% в production", date: "2 апреля 2026", tag: "DevOps", read: "12 мин", color: "from-cyan-500 to-blue-600" },
  { title: "React Server Components: мы перешли и вот что вышло", date: "28 марта 2026", tag: "Frontend", read: "6 мин", color: "from-pink-500 to-rose-600" },
];

export function useIntersectionObserver(threshold = 0.1) {
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

export function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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