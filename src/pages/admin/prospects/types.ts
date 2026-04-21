export const PROSPECTS_URL = "https://functions.poehali.dev/8146ab1d-615f-4e22-bfef-1cdb9da3f944";

export const SOURCES = [
  { key: "egrul",  label: "ЕГРЮЛ / ФНС",       icon: "Landmark",   color: "text-blue-400",    desc: "Реестр компаний" },
  { key: "eis",    label: "ЕИС Гос. закупки",   icon: "Building2",  color: "text-emerald-400", desc: "Закупщики" },
  { key: "kontur", label: "Контур.Фокус",        icon: "Focus",      color: "text-violet-400",  desc: "Финансы / ОКВЭД" },
  { key: "2gis",   label: "2ГИС",               icon: "MapPin",     color: "text-orange-400",  desc: "Бизнес-каталог" },
  { key: "msp",    label: "Реестр МСП",          icon: "Store",      color: "text-pink-400",    desc: "Малый и средний бизнес" },
  { key: "hh",     label: "HH.ru",               icon: "Briefcase",  color: "text-red-400",     desc: "Нанимают IT" },
];

export const STATUSES: { key: string; label: string; color: string; bg: string }[] = [
  { key: "new",         label: "Новый",              color: "text-slate-300",   bg: "bg-slate-500/20 text-slate-300" },
  { key: "contacted",   label: "Контакт установлен", color: "text-blue-300",    bg: "bg-blue-500/20 text-blue-300" },
  { key: "interested",  label: "Интерес проявлен",   color: "text-cyan-300",    bg: "bg-cyan-500/20 text-cyan-300" },
  { key: "negotiation", label: "Переговоры",         color: "text-amber-300",   bg: "bg-amber-500/20 text-amber-300" },
  { key: "won",         label: "Клиент",             color: "text-emerald-300", bg: "bg-emerald-500/20 text-emerald-300" },
  { key: "lost",        label: "Отказ",              color: "text-red-300",     bg: "bg-red-500/20 text-red-300" },
  { key: "postponed",   label: "Отложен",            color: "text-purple-300",  bg: "bg-purple-500/20 text-purple-300" },
];

export const PRIORITIES: { key: string; label: string; color: string }[] = [
  { key: "low",    label: "Низкий",  color: "text-slate-400" },
  { key: "medium", label: "Средний", color: "text-amber-400" },
  { key: "high",   label: "Высокий", color: "text-red-400" },
];

export const ACTIVITY_ICONS: Record<string, string> = {
  call:          "Phone",
  email:         "Mail",
  meeting:       "Users",
  note:          "FileText",
  status_change: "RefreshCw",
};

export interface Project {
  id: number;
  name: string;
  description: string;
  color: string;
  prospect_count: number;
  created_at: string;
}

export interface Prospect {
  id: number;
  project_id: number | null;
  project_name: string | null;
  project_color: string | null;
  company_name: string;
  inn: string;
  ogrn: string;
  industry: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  region: string;
  source: string;
  source_url: string;
  revenue_range: string;
  employee_count: string;
  founded_year: number | null;
  status: string;
  priority: string;
  note: string;
  next_action: string;
  next_action_date: string | null;
  ai_score: number | null;
  ai_summary: string;
  ai_reasons: string[];
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  company_name: string;
  inn: string;
  ogrn: string;
  industry: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  region: string;
  source: string;
  source_url: string;
  revenue_range: string;
  employee_count: string;
  founded_year: number | null;
}

export interface Activity {
  id: number;
  prospect_id: number;
  activity_type: string;
  content: string;
  created_at: string;
}

export interface AiAnalysis {
  score: number;
  priority: string;
  summary: string;
  reasons: string[];
  pain_points: string[];
  offer: string;
  approach: string;
  next_action: string;
  risks: string[];
  error?: string;
}

export function statusInfo(key: string) {
  return STATUSES.find(s => s.key === key) || STATUSES[0];
}
export function priorityInfo(key: string) {
  return PRIORITIES.find(p => p.key === key) || PRIORITIES[1];
}
export function scoreColor(s: number | null): string {
  if (s === null) return "text-white/30";
  return s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-red-400";
}
export function scoreBg(s: number | null): string {
  if (s === null) return "bg-white/10";
  return s >= 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-500" : "bg-red-500";
}