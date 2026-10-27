export const BIZ_URL = "https://functions.poehali.dev/d42f7944-adbd-48ff-a58d-caa1119b0e77";

export interface MarketMetrics {
  companies: number;
  with_revenue: number;
  revenue: number;
  expenses: number;
  profitable: number;
  staff: number;
  median_revenue: number;
  top10_share: number;
  hhi: number | null;
  micro: number;
  small: number;
  medium: number;
  non_msp: number;
  new_3y: number;
  with_debt: number;
  debt_sum: number;
  usn: number;
  grants_companies: number;
  grants_sum: number;
}

export interface TopCompany {
  rank: number;
  inn: string;
  name: string;
  region: string;
  city?: string;
  okved: string;
  revenue: number;
  expenses: number | null;
  staff: number | null;
  msp_cat: number;
  share?: number;
  locked?: boolean;
  region_name?: string;
}

export interface MarketReport {
  okved: string;
  region: string;
  okved_name: string;
  section: string;
  region_name: string;
  metrics: MarketMetrics;
  national: MarketMetrics | null;
  segments: { code: string; name: string; companies: number; revenue: number; staff: number }[];
  geo: { region: string; name: string; companies: number; revenue: number; median_revenue?: number }[];
  size_dist: { label: string; companies: number; revenue: number }[];
  cohorts: { y: number; n: number }[];
  top: TopCompany[];
  grants: { n: number; s: number };
  insights: { kind: string; text: string }[];
  period: string;
  full_access: boolean;
  unlocked?: boolean;
}

export interface Overview {
  total: MarketMetrics;
  industries: { okved2: string; name: string; section: string; companies: number; revenue: number; median_revenue: number; top10_share: number; profitable: number; with_revenue: number; staff: number; grants_sum: number }[];
  regions: { region: string; name: string; companies: number; revenue: number; staff: number; median_revenue: number; with_revenue: number; profitable: number; new_3y: number; grants_sum: number }[];
  period: string;
}

export interface RiskFactor { level: "high" | "mid" | "good"; text: string }

export interface CompanyReport {
  inn: string;
  name: string;
  short_name: string;
  ogrn: string;
  kpp: string;
  status: string;
  registered: number | null;
  liquidated: number | null;
  region: string;
  region_name: string;
  city: string;
  address: string;
  okved: string;
  okved_name: string;
  okved2: string;
  okved2_name: string;
  head: string;
  head_post: string;
  opf: string;
  capital: number | null;
  branches: number | null;
  msp: string;
  msp_year: number | null;
  staff: number | null;
  tax_mode: string;
  tax_debt: number;
  finance: { revenue: number | null; expenses: number | null; profit: number | null; margin: number | null; rev_per_staff: number | null };
  peers: { n: number; med: number; med_margin: number | null; med_rps: number | null; rank: number; rank_ru: number; n_ru: number } | null;
  competitors: { inn: string; name: string; revenue: number; staff: number | null; locked?: boolean }[];
  grant: { total_amount: number; last_date: string; last_amount: number; source: string; source_full: string; payments: number } | null;
  risk: { score: number; level: "low" | "mid" | "high"; factors: RiskFactor[] };
  egrul_live: boolean;
  full_access: boolean;
  unlocked?: boolean;
}

export interface SearchItem { inn: string; name: string; region: string; region_name: string; okved: string; revenue: number | null; address?: string }

function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
}

/** Публичные данные для серверной отрисовки (без токена админа). data=null — ошибка сети или данных. */
export async function bizPublic<T>(params: Record<string, string>): Promise<{ status: number; data: T | null }> {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  try {
    const res = await fetch(`${BIZ_URL}/?${new URLSearchParams(clean).toString()}`);
    const json = await res.json();
    return { status: res.status, data: res.ok && !json?.error ? (json as T) : null };
  } catch {
    return { status: 0, data: null };
  }
}

export function userToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("matlabs_pipes_token") || "";
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const t = token();
  const u = userToken();
  if (t) h["X-Session-Token"] = t;
  if (u) h["X-User-Token"] = u;
  return h;
}

export async function bizGet<T>(params: Record<string, string>): Promise<T & { error?: string }> {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  const res = await fetch(`${BIZ_URL}/?${new URLSearchParams(clean).toString()}`, { headers: authHeaders() });
  return res.json();
}

export async function bizPost<T>(body: Record<string, unknown>): Promise<T & { error?: string; upgrade?: boolean; ok?: boolean }> {
  try {
    const res = await fetch(`${BIZ_URL}/`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({ error: "Сервер не ответил" }));
    if (res.status === 401 && userToken() && body.action !== "admin_set_plan") { localStorage.removeItem("matlabs_pipes_token"); window.dispatchEvent(new Event("biz-auth")); }
    return j;
  } catch {
    return { error: "Нет связи с сервером" } as T & { error: string };
  }
}

export type BizPlanId = "free" | "pro" | "corp";
export interface BizUsage { used: number; limit: number | null; period: "total" | "month" }
export interface BizWatch { inn: string; name: string; snapshot: Record<string, unknown>; changes: { level: "high" | "mid" | "good"; text: string; at: string }[]; last_checked_at: string | null; last_change_at: string | null; created_at: string }
export interface BizMe {
  user: { id: number; email: string; name: string | null; company: string | null; biz_plan: BizPlanId; biz_plan_until: string | null };
  plan: { title: string; price: number; company: number | null; market: number; watch: number };
  usage: { company: BizUsage; market: BizUsage; watch: { used: number; limit: number } };
  unlocks: { kind: "company" | "market"; key: string; title: string; created_at: string }[];
  watch: BizWatch[];
}

export async function bizOrder(body: Record<string, string>) {
  const res = await fetch(`${BIZ_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "order", ...body }),
  });
  return res.json();
}

export function money(v: number | string | null | undefined, short = false): string {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  const f = (x: number, d = 1) => x.toLocaleString("ru-RU", { maximumFractionDigits: d });
  if (a >= 1e12) return `${f(n / 1e12)} трлн${short ? "" : " ₽"}`;
  if (a >= 1e9) return `${f(n / 1e9)} млрд${short ? "" : " ₽"}`;
  if (a >= 1e6) return `${f(n / 1e6)} млн${short ? "" : " ₽"}`;
  if (a >= 1e3) return `${f(n / 1e3, 0)} тыс.${short ? "" : " ₽"}`;
  return `${f(n, 0)}${short ? "" : " ₽"}`;
}

export const num = (v: number | string | null | undefined) => (Number(v) || 0).toLocaleString("ru-RU");
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export function prettyName(raw: string): string {
  let s = (raw || "").replace(/\s+/g, " ").trim();
  const OPF: [RegExp, string][] = [
    [/^ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ\s*/i, "ООО "],
    [/^ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "ПАО "],
    [/^НЕПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "АО "],
    [/^АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "АО "],
    [/^ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "ЗАО "],
    [/^ОТКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "ОАО "],
    [/^СЕЛЬСКОХОЗЯЙСТВЕННЫЙ ПРОИЗВОДСТВЕННЫЙ КООПЕРАТИВ\s*/i, "СПК "],
    [/^КРЕСТЬЯНСКОЕ \(ФЕРМЕРСКОЕ\) ХОЗЯЙСТВО\s*/i, "КФХ "],
    [/^ФЕДЕРАЛЬНОЕ ГОСУДАРСТВЕННОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ\s*/i, "ФГУП "],
    [/^МУНИЦИПАЛЬНОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ\s*/i, "МУП "],
    [/^АВТОНОМНАЯ НЕКОММЕРЧЕСКАЯ ОРГАНИЗАЦИЯ\s*/i, "АНО "],
  ];
  for (const [re, r] of OPF) if (re.test(s)) { s = s.replace(re, r); break; }
  const m = s.match(/^(\S+(?: \S+)?) "(.+)"$/);
  if (m) return `${m[1]} «${m[2].replace(/"/g, "")}»`;
  return s.replace(/"([^"]+)"/g, "«$1»");
}

export const MSP_LABEL: Record<number, string> = { 0: "Крупная / без статуса", 1: "Микро", 2: "Малое", 3: "Среднее" };

export const PRICES = { market: 4900, company: 0, check: 0, pro: 2990, corp: 9900, research: 35000 } as const;

export function fmtYear(ms: number | null) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("ru-RU");
}

export interface DbFilters {
  okved2?: string[];
  okved?: string[];
  region?: string[];
  msp_cat?: string[];
  tax_mode?: string[];
  min_revenue?: number;
  max_revenue?: number;
  min_staff?: number;
  max_staff?: number;
  min_debt?: number;
  msp_year_from?: number;
  profitable?: boolean;
  no_debt?: boolean;
  grants?: boolean;
  has_contacts?: boolean;
  loss?: boolean;
}

export interface BizDatabase {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: "industry" | "region" | "segment";
  icon: string;
  filters: DbFilters;
  price: number;
  stats: { companies: number; revenue: number; with_revenue: number; profitable: number; staff: number; regions: number; with_contacts: number } | null;
}

export interface DbAnalysis {
  metrics: MarketMetrics & { osn: number };
  by_region: { region: string; name: string; companies: number; revenue: number; staff: number }[];
  by_okved: { code: string; name: string; companies: number; revenue: number }[];
  size_dist: { label: string; companies: number; revenue: number }[];
  cohorts: { y: number; n: number }[];
  tax: { mode: string; n: number }[];
}

export interface DbCompany {
  inn: string;
  name: string;
  region: string;
  region_name: string;
  city: string;
  okved: string;
  revenue: number | null;
  expenses: number | null;
  staff: number | null;
  msp_cat: number;
  msp_year: number;
  tax_mode: string;
  tax_debt: number;
  locked?: boolean;
}

export interface DbResponse {
  meta: Omit<BizDatabase, "stats"> | null;
  filters: DbFilters;
  analysis: DbAnalysis;
  items: DbCompany[];
  page: number;
  per_page: number;
  price: number;
  full_access: boolean;
  insights: { kind: string; text: string }[];
}

export function encodeFilters(f: DbFilters): string {
  return encodeURIComponent(JSON.stringify(f));
}

export function decodeFilters(s: string | null): DbFilters {
  if (!s) return {};
  try { return JSON.parse(decodeURIComponent(s)); } catch { return {}; }
}