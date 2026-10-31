export interface HouseAd {
  id: string;
  brand: string;
  domain: string;
  url: string;
  image: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  from: string;
  to: string;
}

const utm = (base: string, slot: string) => `${base}${base.includes("?") ? "&" : "?"}utm_source=masshtab&utm_medium=site&utm_campaign=${slot}`;

export const HOUSE_ADS: HouseAd[] = [
  {
    id: "matlabs", brand: "МАТ-Лабс", domain: "mat-labs.ru", url: "https://mat-labs.ru/", image: "/img/masshtab/promo/web-matlabs.webp",
    kicker: "Автоматизация с ИИ", title: "Рутину — роботам. Рост — вам",
    text: "Встраиваем ИИ в заявки, CRM, документы и отчёты. Первая консультация — 0 ₽, пробный проект — от 30 тыс. ₽.",
    cta: "Записаться на консультацию", from: "#7c3aed", to: "#22d3ee",
  },
  {
    id: "uchispro", brand: "УЧИСЬПРО", domain: "учисьпро.рф", url: "https://xn--h1amcedk2a6b.xn--p1ai/", image: "/img/masshtab/promo/web-uchispro.webp",
    kicker: "ИИ-репетитор для школьников", title: "Объясняет, пока не станет понятно",
    text: "Все предметы 1–11 класса, ОГЭ и ЕГЭ, проверка домашки по фото. 7 дней бесплатно без карты, дальше 1 490 ₽ в месяц.",
    cta: "Попробовать бесплатно", from: "#c026d3", to: "#fbbf24",
  },
  {
    id: "avangard", brand: "АВАНГАРД", domain: "avangard-ai.ru", url: "https://avangard-ai.ru/", image: "/img/masshtab/promo/web-avangard.webp",
    kicker: "ИИ-эксперт по ремонту и дизайну", title: "Дизайн-проект и смета ремонта — онлайн",
    text: "Задайте вопрос ИИ-эксперту, получите дизайн-проект интерьера и расчёт сметы. Партнёры-исполнители по всей России.",
    cta: "Получить консультацию", from: "#6366f1", to: "#a855f7",
  },
  {
    id: "agroport", brand: "АгроПорт", domain: "agroport-ai.ru", url: "https://agroport-ai.ru/", image: "/img/masshtab/promo/web-agroport.webp",
    kicker: "ИИ-аналитика агрорынка", title: "Прогноз цен на зерно и мониторинг посевов",
    text: "Прогнозы цен на пшеницу, подсолнечник и кукурузу, спутниковый NDVI-мониторинг полей и маркетплейс зерна.",
    cta: "Смотреть прогнозы", from: "#16a34a", to: "#a3e635",
  },
  {
    id: "uchispro-school", brand: "УЧИСЬПРО", domain: "учисьпро.рф", url: "https://xn--h1amcedk2a6b.xn--p1ai/", image: "/img/masshtab/promo/web-uchispro-school.webp",
    kicker: "Пилот для школ · 2026/27", title: "ИИ-наставник для всей школы — бесплатно",
    text: "До 31 мая 2027 года: разбор домашки по фото, курсы 1–11 класса, подготовка к ОГЭ и ЕГЭ. Без договоров и нагрузки на учителей.",
    cta: "Подключить школу", from: "#c026d3", to: "#f97316",
  },
];

export const houseUrl = (a: HouseAd, slot: string) => utm(a.url, slot);
