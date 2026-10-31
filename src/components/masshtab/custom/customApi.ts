import func2url from "../../../../backend/func2url.json";

export const CUSTOM_URL = (func2url as Record<string, string>)["masshtab-custom"];
export const PIPES_URL = (func2url as Record<string, string>)["pipes"];
const TOKEN = "matlabs_pipes_token";

export const getToken = () => localStorage.getItem(TOKEN) || "";
export const setToken = (t: string) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN));

export type ModuleSel =
  | { kind: "post"; id: number }
  | { kind: "archive"; id: string }
  | { kind: "rating"; region: string; section: string; top: number }
  | { kind: "indicators" }
  | { kind: "uch"; id: string }
  | { kind: "market"; region: string; section: string }
  | { kind: "quotes" }
  | { kind: "notes" };

export interface UchItem { slug: string; title: string; lead: string; topic: string; read_min: number | null; published_at: string }

export interface CatPost { id: number; rubric: string; title: string; lead: string; read_min: number | null; published_at: string }
export interface CatArchiveItem { id: string; from: number; to: number; rubric: string; title: string; pages: number }
export interface Catalog {
  price: number;
  max_modules: number;
  uch: UchItem[];
  uch_topics: { slug: string; name: string }[];
  posts: CatPost[];
  archive: { issue: string; issue_title: string; articles: CatArchiveItem[] }[];
  regions: { code: string; name: string }[];
  sections: string[];
}

export type IssueStatus = "draft" | "pending" | "paid" | "building" | "ready" | "failed";
export interface CustomIssue {
  id: number;
  title: string;
  cover_name: string | null;
  cover_company: string | null;
  modules: ModuleSel[];
  price: number;
  status: IssueStatus;
  pdf_url: string | null;
  pages: number | null;
  error: string | null;
  created_at: string;
  paid_at: string | null;
  built_at: string | null;
}

type Res<T> = T & { error?: string };

export async function customGet<T>(action: string): Promise<Res<T>> {
  try {
    const r = await fetch(`${CUSTOM_URL}/?action=${action}`, { headers: { "X-User-Token": getToken() } });
    const j = await r.json();
    if (r.status === 401 && action !== "catalog") setToken("");
    return j;
  } catch {
    return { error: "Нет связи с сервером — попробуйте ещё раз" } as Res<T>;
  }
}

export async function customPost<T>(body: Record<string, unknown>): Promise<Res<T>> {
  try {
    const r = await fetch(`${CUSTOM_URL}/`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Token": getToken() }, body: JSON.stringify(body) });
    return await r.json();
  } catch {
    return { error: "Нет связи с сервером — попробуйте ещё раз" } as Res<T>;
  }
}

export async function pipesAuth<T>(action: "send_code" | "verify", body: Record<string, unknown>): Promise<Res<T>> {
  try {
    const r = await fetch(`${PIPES_URL}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    return await r.json();
  } catch {
    return { error: "Нет связи с сервером — попробуйте ещё раз" } as Res<T>;
  }
}

export const STATUS_LABEL: Record<IssueStatus, string> = {
  draft: "Черновик",
  pending: "Ожидает оплаты",
  paid: "Оплачен, собираем",
  building: "Собираем PDF",
  ready: "Готов",
  failed: "Ошибка сборки",
};

export const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;
