export const PAGE_URL = "https://mat-labs.ru/skolko-stoit-avtomatizaciya";

export interface TaskOption {
  id: string;
  label: string;
  icon: string;
  desc: string;
  base: number;
  days: string;
}

export const tasks: TaskOption[] = [
  {
    id: "leads",
    label: "Не терять заявки",
    icon: "Inbox",
    desc: "Формы, CRM, уведомления менеджеру, автоответы клиенту",
    base: 150000,
    days: "7–10 дней",
  },
  {
    id: "ai",
    label: "AI отвечает клиентам",
    icon: "Bot",
    desc: "Ассистент 24/7, квалификация лидов, разбор обращений",
    base: 250000,
    days: "10–14 дней",
  },
  {
    id: "site",
    label: "Сайт, приносящий заявки",
    icon: "Globe",
    desc: "Конверсионный сайт с интеграцией в CRM и аналитикой",
    base: 180000,
    days: "7–10 дней",
  },
  {
    id: "analytics",
    label: "Видеть цифры бизнеса",
    icon: "BarChart3",
    desc: "Дашборды, отчёты, сведение данных из разных систем",
    base: 200000,
    days: "2 недели",
  },
  {
    id: "all",
    label: "Всё вместе, под ключ",
    icon: "Layers",
    desc: "Связка всех систем, дашборд, автоматизация процессов",
    base: 500000,
    days: "3–4 недели",
  },
];

export interface SizeOption {
  id: string;
  label: string;
  desc: string;
  mult: number;
}

export const sizes: SizeOption[] = [
  { id: "s", label: "До 50 заявок в месяц", desc: "Небольшая команда, простые процессы", mult: 1 },
  { id: "m", label: "50–300 заявок", desc: "Несколько менеджеров, есть регламенты", mult: 1.4 },
  { id: "l", label: "Больше 300 заявок", desc: "Отдел продаж, сложная маршрутизация", mult: 1.9 },
];

export interface IntegrationOption {
  id: string;
  label: string;
  icon: string;
  price: number;
}

export const integrations: IntegrationOption[] = [
  { id: "crm", label: "CRM (Битрикс24, amoCRM)", icon: "Database", price: 20000 },
  { id: "msg", label: "Telegram / WhatsApp", icon: "MessageCircle", price: 15000 },
  { id: "1c", label: "1С или ERP", icon: "Server", price: 35000 },
  { id: "mail", label: "Почта и рассылки", icon: "Mail", price: 12000 },
  { id: "analytics", label: "Метрика и сквозная аналитика", icon: "LineChart", price: 18000 },
  { id: "pay", label: "Платёжные системы", icon: "CreditCard", price: 25000 },
];

export interface SupportOption {
  id: string;
  label: string;
  desc: string;
  monthly: number;
  months: number;
}

export const supports: SupportOption[] = [
  { id: "none", label: "Только гарантия", desc: "1 месяц на исправление ошибок — входит в стоимость", monthly: 0, months: 0 },
  { id: "m3", label: "Сопровождение 3 месяца", desc: "30 000 ₽ в месяц", monthly: 30000, months: 3 },
  { id: "m6", label: "Сопровождение 6 месяцев", desc: "27 500 ₽ в месяц — выгоднее на 8%", monthly: 27500, months: 6 },
  { id: "m12", label: "Сопровождение 12 месяцев", desc: "25 000 ₽ в месяц — максимальная выгода", monthly: 25000, months: 12 },
];

export interface CalcResult {
  project: number;
  supportTotal: number;
  supportMonthly: number;
  supportMonths: number;
  total: number;
  days: string;
}

export const fmt = (n: number) => n.toLocaleString("ru-RU");

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Сколько стоит автоматизация бизнес-процессов?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Базовая автоматизация обработки заявок — от 150 000 ₽ за 7–10 дней. Внедрение AI-ассистента — от 250 000 ₽. Комплексный проект под ключ — от 500 000 ₽. Итоговая цена зависит от объёма заявок и количества систем, которые нужно связать.",
      },
    },
    {
      "@type": "Question",
      name: "От чего зависит стоимость автоматизации?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "От трёх факторов: какую задачу решаем, какой объём заявок обрабатывает компания и сколько систем нужно связать между собой. Каждая интеграция — это отдельная работа: подключение CRM обходится в 20 000 ₽, связка с 1С — в 35 000 ₽.",
      },
    },
    {
      "@type": "Question",
      name: "Сколько стоит сопровождение после запуска?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "От 30 000 ₽ в месяц. При оплате за 6 месяцев — 27 500 ₽ в месяц, за 12 месяцев — 25 000 ₽ в месяц. В сопровождение входят доработки, контроль интеграций, приоритетная реакция на сбои и ежемесячный отчёт.",
      },
    },
    {
      "@type": "Question",
      name: "Окупается ли автоматизация?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Считать нужно от стоимости ручного труда. Если менеджер тратит 2 часа в день на перенос заявок, за год это около 500 часов. При зарплате 60 000 ₽ в месяц один такой сотрудник обходится компании примерно в 200 000 ₽ в год только на этой операции.",
      },
    },
  ],
};
