import func2url from "../../../backend/func2url.json";

export const M_URL = (func2url as Record<string, string>)["masshtab"];

export interface RatingItem {
  rank: number; rank_ru: number | null; inn: string; name: string; region: string; region_name: string; okved2: string; section: string;
  staff: number | null; rev2022: number; rev2023: number; rev2024: number; rev2025: number; growth: number;
}
export interface RatingStats { companies: number; median: number; regions: number; revenue: number }
export interface RatingResp { items: RatingItem[]; stats: RatingStats; checked: number; eligible: number; updated_at: string | null; page: number; more: boolean; local: boolean }
export interface Filters { regions: { code: string; name: string }[]; sections: string[] }
export interface Post {
  id: number; slug: string; kind: "interview" | "article" | "partner"; rubric: string; title: string; lead: string; hero_name: string; hero_role: string;
  company_inn: string | null; cover_url: string | null; author: string; read_min: number; published: boolean; published_at: string | null; created_at: string; content?: string;
}
export interface CompanyCard {
  inn: string; name: string; region_name: string; staff: number | null; revenue: number | null; expenses: number | null;
  rev2021: number | null; rev2022: number | null; rev2023: number | null; rev2024: number | null; rev2025: number | null; growth: number | null;
}
export interface FullPost extends Post { content: string; company: CompanyCard | null; more: Post[] }
export interface Ad { id: number; slot: "top" | "side" | "inline"; advertiser: string; title: string; text: string; image_url: string | null; link: string; cta: string; active?: boolean; clicks?: number }

export async function mGet<T>(params: Record<string, string | number | undefined>, token?: string): Promise<{ status: number; data: T | null }> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
  try {
    const r = await fetch(`${M_URL}/?${q}`, { headers: token ? { "X-Session-Token": token } : {}, signal: AbortSignal.timeout(9000) });
    return { status: r.status, data: r.ok ? await r.json() : null };
  } catch {
    return { status: 0, data: null };
  }
}

export async function mPost<T>(body: Record<string, unknown>, token?: string): Promise<T & { error?: string }> {
  try {
    const r = await fetch(`${M_URL}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "X-Session-Token": token } : {}) },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch {
    return { error: "Сервер не ответил, попробуйте ещё раз" } as T & { error?: string };
  }
}

export function mln(v: number | null | undefined) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млрд ₽`;
  return `${Math.round(n / 1e6).toLocaleString("ru-RU")} млн ₽`;
}

export function growthLabel(g: number) {
  if (g >= 1000) return `×${(g / 100 + 1).toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`;
  return `+${Math.round(g).toLocaleString("ru-RU")}%`;
}

export function companyName(raw: string) {
  const s = (raw || "").replace(/\s+/g, " ").trim();
  const map: [RegExp, string][] = [
    [/^ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ\s*/i, "ООО "], [/^ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "ПАО "],
    [/^НЕПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "АО "], [/^АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "АО "], [/^ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*/i, "ЗАО "],
    [/^СЕЛЬСКОХОЗЯЙСТВЕННЫЙ ПРОИЗВОДСТВЕННЫЙ КООПЕРАТИВ\s*/i, "СПК "], [/^ПРОИЗВОДСТВЕННЫЙ КООПЕРАТИВ\s*/i, "ПК "],
  ];
  let out = s;
  for (const [re, r] of map) if (re.test(out)) { out = out.replace(re, r); break; }
  const m = out.match(/^(\S+) "(.+)"$/);
  const body = m ? m[2].replace(/"/g, "") : out.replace(/"/g, "");
  const title = body.toLowerCase().replace(/(^|[\s\-«(.])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  return { opf: m ? m[1] : "", title };
}

export const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "");
