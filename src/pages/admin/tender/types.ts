export const TENDER_URL = "https://functions.poehali.dev/0d043904-1f56-48c0-bc77-ea7f394558a3";

export const QUICK_QUERIES = [
  "разработка программного обеспечения", "искусственный интеллект",
  "информационная система", "цифровая трансформация",
  "кибербезопасность", "облачные сервисы",
  "веб-разработка", "мобильное приложение",
  "автоматизация бизнес-процессов", "чат-бот",
];

export const MARKET_SOURCES = [
  { key: "eis",       label: "ЕИС zakupki.gov.ru", icon: "Landmark",    color: "text-blue-400",    bg: "bg-blue-500/20 text-blue-300",       desc: "44-ФЗ / 223-ФЗ" },
  { key: "hh",        label: "HH.ru",              icon: "Briefcase",   color: "text-red-400",     bg: "bg-red-500/20 text-red-300",         desc: "Проекты" },
  { key: "habr",      label: "Habr Freelance",      icon: "Code2",       color: "text-emerald-400", bg: "bg-emerald-500/20 text-emerald-300", desc: "IT-задания ↗" },
  { key: "fl",        label: "FL.ru",               icon: "Layers",      color: "text-amber-400",   bg: "bg-amber-500/20 text-amber-300",     desc: "Фриланс ↗" },
  { key: "kwork",     label: "Kwork",               icon: "Zap",         color: "text-violet-400",  bg: "bg-violet-500/20 text-violet-300",   desc: "Задачи ↗" },
  { key: "youdo",     label: "YouDo",               icon: "CheckSquare", color: "text-orange-400",  bg: "bg-orange-500/20 text-orange-300",   desc: "Услуги" },
  { key: "weblancer", label: "Weblancer",           icon: "Globe",       color: "text-teal-400",    bg: "bg-teal-500/20 text-teal-300",       desc: "Фриланс ↗" },
  { key: "upwork",    label: "Upwork",              icon: "Globe2",      color: "text-cyan-400",    bg: "bg-cyan-500/20 text-cyan-300",       desc: "Международные ↗" },
];

export const CORP_LIST = [
  // Банки и финансы
  { key: "sber",        name: "Сбербанк",          icon: "🟢", group: "Банки" },
  { key: "vtb",         name: "ВТБ",               icon: "🏦", group: "Банки" },
  // Нефть и газ
  { key: "gazprom",     name: "Газпром",            icon: "🔵", group: "Нефть и газ" },
  { key: "rosneft",     name: "Роснефть",           icon: "⚡", group: "Нефть и газ" },
  { key: "lukoil",      name: "Лукойл",             icon: "🛢️", group: "Нефть и газ" },
  { key: "gazprom_bur", name: "Газпром Бурение",    icon: "⛏️", group: "Нефть и газ" },
  { key: "transneft",   name: "Транснефть",         icon: "🔧", group: "Нефть и газ" },
  { key: "novatek",     name: "НОВАТЭК",            icon: "🌊", group: "Нефть и газ" },
  { key: "russneft",    name: "Русснефть",          icon: "🏭", group: "Нефть и газ" },
  { key: "surgutneft",  name: "Сургутнефтегаз",    icon: "🛤️", group: "Нефть и газ" },
  { key: "tatneft",     name: "Татнефть",           icon: "🔶", group: "Нефть и газ" },
  { key: "sibur",       name: "СИБУР",              icon: "🧪", group: "Нефть и газ" },
  // Госкорпорации и инфраструктура
  { key: "rosatom",     name: "Росатом",            icon: "⚛️", group: "Госкорпорации" },
  { key: "rzd",         name: "РЖД",               icon: "🚂", group: "Госкорпорации" },
  { key: "pochta",      name: "Почта России",       icon: "📮", group: "Госкорпорации" },
  { key: "rosnano",     name: "РОСНАНО",            icon: "🔬", group: "Госкорпорации" },
  { key: "skolkovo",    name: "Сколково",           icon: "🏗️", group: "Госкорпорации" },
  { key: "rosavtodor",  name: "Росавтодор",         icon: "🛣️", group: "Госкорпорации" },
  { key: "avtodor",     name: "Автодор",            icon: "🚗", group: "Госкорпорации" },
  { key: "alrosa",      name: "АЛРОСА",             icon: "💎", group: "Госкорпорации" },
  // Промышленность
  { key: "evraz",       name: "ЕВРАЗ",              icon: "🏗️", group: "Промышленность" },
  { key: "rusal",       name: "РУСАЛ",              icon: "⚙️", group: "Промышленность" },
  { key: "severstal",   name: "Северсталь",         icon: "🔩", group: "Промышленность" },
  { key: "kamaz",       name: "КАМАЗ",              icon: "🚛", group: "Промышленность" },
  { key: "avtovaz",     name: "АвтоВАЗ",           icon: "🚙", group: "Промышленность" },
  { key: "avtotour",    name: "АВТОТОР",            icon: "🏎️", group: "Промышленность" },
  { key: "gaz_group",   name: "Группа ГАЗ",        icon: "🚌", group: "Промышленность" },
  // Телеком и технологии
  { key: "rostelecom",  name: "Ростелеком",         icon: "📡", group: "Телеком" },
  { key: "mts",         name: "МТС",               icon: "📱", group: "Телеком" },
  { key: "beeline",     name: "Билайн",             icon: "🐝", group: "Телеком" },
  { key: "megafon",     name: "МегаФон",            icon: "📶", group: "Телеком" },
  { key: "yandex",      name: "Яндекс",             icon: "🔴", group: "Телеком" },
  { key: "mail",        name: "VK / Mail.ru",       icon: "💙", group: "Телеком" },
  { key: "afk",         name: "АФК Система",        icon: "🏢", group: "Телеком" },
  { key: "sbertech",    name: "СберТех",            icon: "💻", group: "Телеком" },
  // Ритейл и FMCG
  { key: "magnit",      name: "Магнит",             icon: "🛒", group: "Ритейл" },
  { key: "euroset",     name: "Евросеть",           icon: "📞", group: "Ритейл" },
  { key: "eldorado",    name: "Эльдорадо",          icon: "🏪", group: "Ритейл" },
  { key: "megapolis",   name: "Группа Мегаполис",   icon: "🏙️", group: "Ритейл" },
  { key: "baltika",     name: "Балтика",            icon: "🍺", group: "Ритейл" },
];

export type Tab = "search" | "corporate" | "saved";

export interface Tender {
  id: string; name: string; price: number; price_fmt: string;
  customer: string; end_date: string; law: string; status: string;
  region: string; url: string; source: string; source_key?: string; saved?: boolean;
}

export interface SavedTender extends Tender {
  db_id: number; note: string; analysis: Analysis | null;
  created_at: string; external_id: string;
}

export interface KpSection { title: string; content: string; }

export interface Analysis {
  relevance_score: number; win_probability: number; relevance_comment: string;
  win_factors: string[]; risks: string[]; recommended_price: string;
  kp_structure: { title: string; sections: KpSection[] };
  key_requirements: string[]; timeline: string; team: string; conclusion: string;
}

export interface MetaItem { source: string; count: number; total: number; search_url: string; }
export interface LinkItem  { source: string; url: string; }

export interface CorpStatus {
  key: string; name: string; icon: string; ok: boolean; error: string;
  count: number; link_only: boolean; search_url: string;
}

export function sourceColor(src: string): string {
  const m = MARKET_SOURCES.find(s => s.label === src);
  return m?.bg || "bg-white/10 text-white/50";
}

export function sc(s: number): string { return s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-red-400"; }
export function sb(s: number): string { return s >= 70 ? "bg-emerald-500"   : s >= 40 ? "bg-amber-500"   : "bg-red-500"; }