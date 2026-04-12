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
  { icon: "Code2", title: "Разработка ПО", desc: "Создаём масштабируемые веб и мобильные приложения с нуля до запуска", color: "from-violet-500 to-purple-600", price: "от 150 000 ₽" },
  { icon: "Cloud", title: "Облачные решения", desc: "Миграция в облако, DevOps, Kubernetes, CI/CD и автоматизация инфраструктуры", color: "from-cyan-500 to-blue-600", price: "от 80 000 ₽" },
  { icon: "Brain", title: "ИИ и ML", desc: "Нейросети, компьютерное зрение, NLP и предиктивная аналитика для вашего бизнеса", color: "from-pink-500 to-rose-600", price: "от 200 000 ₽" },
  { icon: "Shield", title: "Кибербезопасность", desc: "Аудит, пентест, защита данных и соответствие требованиям GDPR и 152-ФЗ", color: "from-emerald-500 to-teal-600", price: "от 60 000 ₽" },
  { icon: "BarChart3", title: "Аналитика данных", desc: "BI-решения, дашборды, ETL-пайплайны и Data Warehouse под ваши KPI", color: "from-orange-500 to-amber-600", price: "от 90 000 ₽" },
  { icon: "Smartphone", title: "Мобильные приложения", desc: "iOS и Android нативные и кросс-платформенные решения на React Native и Flutter", color: "from-indigo-500 to-blue-600", price: "от 180 000 ₽" },
];

export const portfolio = [
  { title: "АВАНГАРД", category: "ИИ / Дизайн", desc: "ИИ-эксперт по дизайну и ремонту: онлайн-консультации, создание дизайн-проектов интерьера и расчёт сметы", tech: ["AI", "React", "Python"], color: "from-violet-600 to-indigo-600", url: "https://avangard-ai.ru" },
  { title: "Купец в плюсе", category: "Бизнес-сервисы", desc: "Агрегатор бизнес-услуг, собирающий лучшие предложения от проверенных партнёров для развития бизнеса", tech: ["React", "Node.js", "PostgreSQL"], color: "from-cyan-600 to-blue-600", url: "https://купецвплюсе.рф" },
  { title: "AVT", category: "CRM / ИИ", desc: "Платформа автоматизации работы с клиентами: ИИ-звонки, email-рассылки и встроенная CRM-система", tech: ["AI", "Python", "FastAPI"], color: "from-pink-600 to-rose-600", url: "https://avt-63.ru" },
  { title: "БухКонтроль", category: "Бухгалтерия", desc: "Профессиональный бухгалтерский аутсорсинг для агробизнеса: учёт, налоговая оптимизация и консультации", tech: ["React", "Python", "PostgreSQL"], color: "from-emerald-600 to-teal-600", url: "https://bk-63.ru" },
  { title: "RoomScan AI", category: "ИИ / Недвижимость", desc: "ИИ-инструмент для сканирования и планировки помещений с автоматическим расчётом площади и материалов", tech: ["AI", "React", "ML"], color: "from-orange-600 to-amber-600", url: "https://roomscan-ai.ru" },
  { title: "SoloFly", category: "Авиация / Обучение", desc: "Платформа для пилотов-любителей и учлётов: маршруты, документация, обучение и сообщество частной авиации", tech: ["React", "Python", "PostgreSQL"], color: "from-sky-600 to-blue-700", url: "https://solofly.ru" },
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
  {
    title: "Как мы обучили GPT-модель на корпоративных данных за 2 недели",
    date: "8 апреля 2026",
    tag: "AI/ML",
    read: "8 мин",
    color: "from-violet-500 to-purple-600",
    content: `В условиях растущей нагрузки на сотрудников и необходимости быстрого доступа к информации мы решили внедрить GPT-модель, обученную на внутренних данных компании. Это позволило автоматизировать ответы на типовые запросы, ускорить поиск информации в базе знаний и снизить нагрузку на специалистов. Мы справились с задачей за 2 недели, используя современные инструменты и методологию.

## Подготовка данных

Первый этап занял 3 дня. Мы собрали все релевантные данные: FAQ, регламенты, инструкции, базы знаний, архивные переписки с клиентами, отчёты и презентации. Особое внимание уделили очистке данных: удалили дубликаты, лишние символы, HTML-теги и служебную информацию. Привели текст к единому формату (plain text). Также провели разметку для диалоговых моделей, добавив метки user: и assistant:.

Чтобы избежать утечки конфиденциальной информации, удалили персональные данные и чувствительные сведения. Для проверки качества данных использовали автоматизированные инструменты и ручной аудит.

## Выбор платформы и методологии

Мы выбрали подход **Retrieval Augmented Generation (RAG)**, так как он позволяет модели обращаться к внешней базе данных при генерации ответов. Это особенно полезно для работы с постоянно обновляемой информацией (нормативные документы, технические спецификации). RAG также минимизирует «галлюцинации» — ситуации, когда модель генерирует недостоверные ответы.

Для реализации использовали платформу **CustomGPT**, которая поддерживает RAG и предоставляет удобный интерфейс для загрузки данных и настройки модели. Альтернативными вариантами могли быть Google Cloud Vertex AI, Azure OpenAI Service или n8n с интеграцией в OpenAI API.

## Обучение модели

Загрузка подготовленных данных и запуск процесса обучения заняли **1 день**. Мы настроили параметры:
* количество эпох — 3 (для начального этапа);
* размер батча — 16 (с учётом возможностей платформы);
* скорость обучения — 2e-5.

После завершения обучения провели **тестирование** в течение 2 дней. Задавали вопросы, на которые модель должна была отвечать, опираясь на загруженные данные. Проверяли не только точность ответов, но и способность модели корректно реагировать на запросы, для которых нет информации в базе (например, отвечать «я не знаю» или перенаправлять запрос).

Если модель «галлюцинировала», то есть генерировала недостоверные ответы, мы анализировали причины и дообучали её на дополнительных примерах.

## Интеграция в рабочие процессы

На **3 дня** ушло внедрение модели в корпоративную среду. Мы интегрировали GPT в корпоративный мессенджер (Telegram), где он стал доступен сотрудникам в виде бота. Для авторизации использовали систему Битрикс24, чтобы ограничить доступ к конфиденциальной информации.

Бот работал по следующему алгоритму:
1. Пользователь задаёт вопрос.
2. Модель ищет релевантные данные в базе знаний.
3. На основе найденных данных генерирует ответ.
4. Пользователь оценивает качество ответа (плохо, средне, хорошо).

Если ответ получал низкую оценку, система автоматически создавала задачу на обновление базы знаний.

## Оптимизация и мониторинг

В течение последней недели мы наблюдали за работой модели и собирали обратную связь от пользователей. На основе фидбека доработали промпты и расширили базу данных. Настроили мониторинг метрик: количество запросов, время отклика, процент корректных ответов.

## Результаты

* Через 24 часа сотрудники могли получать ответы на 30–40% внутренних вопросов, экономя время на поиске информации.
* Через неделю 70–80% рутинных запросов обрабатывались автоматически.
* Через месяц освободилось до 30–50% времени ключевых сотрудников, которое они смогли направить на стратегические задачи.

## Выводы

Успешное внедрение GPT-модели за 2 недели стало возможным благодаря:
* чёткому планированию этапов работы;
* использованию методологии RAG, которая позволила избежать полного переобучения модели;
* выбору готовой платформы, не требующей глубоких знаний программирования;
* поэтапному внедрению с тестированием и корректировкой;
* интеграции с существующей инфраструктурой (Битрикс24, корпоративный мессенджер).

Этот опыт показал, что даже в сжатые сроки можно внедрить эффективное решение на базе ИИ, если грамотно организовать процесс и использовать современные инструменты.`,
  },
  { title: "Kubernetes + FinTech: надёжность 99.999% в production", date: "2 апреля 2026", tag: "DevOps", read: "12 мин", color: "from-cyan-500 to-blue-600", content: "" },
  { title: "React Server Components: мы перешли и вот что вышло", date: "28 марта 2026", tag: "Frontend", read: "6 мин", color: "from-pink-500 to-rose-600", content: "" },
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