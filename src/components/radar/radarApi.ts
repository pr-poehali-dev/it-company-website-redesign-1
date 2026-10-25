export const RADAR_URL = "https://functions.poehali.dev/87e21a71-588b-4c12-bcd1-82fa1c7a202e";

export interface RadarItem {
  inn: string;
  name: string;
  region: string;
  industry: string;
  activity: string;
  segment: string;
  subsegment: string;
  size: string;
  employees: number | null;
  msp_year: number | null;
  source: string;
  source_full: string;
  last_date: string | null;
  last_amount: number;
  total_amount: number;
  payments: number;
  support_years: number | null;
  offer: string;
  score: number;
  has_contacts: boolean;
  has_site?: boolean;
  has_head?: boolean;
  egrul_status?: string;
  registered_at?: string | null;
}

export interface RadarCompany extends RadarItem {
  ogrn: string;
  head: string;
  head_post: string;
  address: string;
  okved: string;
  website_confidence: string;
  contacts_source: string;
  phones: string;
  emails: string;
  website: string;
  locked?: boolean;
  industry_count: number;
  industry_top_pct: number;
  signals: { kind: string; text: string }[];
}

export interface Facet { v: string; n: number; s: number }

export interface Facets {
  region: Facet[];
  industry: Facet[];
  source: Facet[];
  size: Facet[];
  segment: Facet[];
  totals: { companies: number; total: number; regions: number; updated: string; last_30_days: number; with_contacts: number; with_head: number };
  months: { m: string; n: number }[];
}

export interface Filters {
  q: string;
  region: string;
  industry: string;
  source: string;
  size: string;
  year: string;
  min_amount: string;
  min_staff: string;
  has_contacts: string;
  sort: string;
}

export const EMPTY_FILTERS: Filters = {
  q: "", region: "", industry: "", source: "", size: "", year: "", min_amount: "", min_staff: "", has_contacts: "", sort: "fresh",
};

export async function radarGet<T>(params: Record<string, string>): Promise<T> {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  const res = await fetch(`${RADAR_URL}/?${new URLSearchParams(clean).toString()}`);
  return res.json();
}

export async function radarRequest(body: Record<string, string>) {
  const res = await fetch(`${RADAR_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "request", ...body }),
  });
  return res.json();
}

export function fmtMoney(n: number): string {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млрд ₽`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₽`;
  if (v >= 1e3) return `${Math.round(v / 1e3).toLocaleString("ru-RU")} тыс. ₽`;
  return `${v.toLocaleString("ru-RU")} ₽`;
}

export function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}.${m}.${y}`;
}

export function prettyName(raw: string): string {
  const s = (raw || "").replace(/\s+/g, " ").trim();
  const m = s.match(/^([^"]*?) ?"(.+?)"?$/);
  if (!m || !m[2].trim()) return s.replace(/"/g, "");
  const head = m[1].replace(/ ?- ?/g, "-").trim();
  const name = m[2].replace(/"/g, " ").replace(/\s+/g, " ").trim();
  return head ? `${head} «${name}»` : `«${name}»`;
}

export const SOURCE_LABEL: Record<string, string> = {
  "ФСИ": "Фонд содействия инновациям",
  "МИК": "Московский инновационный кластер",
  "ДПиИР Москвы": "Департамент предпринимательства Москвы",
  "КППИТ СПб": "Комитет по промполитике СПб",
};
