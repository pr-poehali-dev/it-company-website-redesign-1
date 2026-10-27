import func2url from "../../../backend/func2url.json";

export const PIPES_URL = (func2url as Record<string, string>)["pipes"];
const TOKEN = "matlabs_pipes_token";

export type Kind = "google_sheets" | "file_url" | "postgres" | "mysql" | "amocrm" | "bitrix24" | "onec" | "metrika" | "moysklad" | "json_api";
export type Schedule = "manual" | "hourly" | "every6h" | "daily" | "weekly";
export type ColType = "number" | "date" | "text";

export interface CleanOpts { trim?: boolean; drop_empty?: boolean; dedupe?: boolean; numbers?: boolean; dates?: boolean; tz?: string; dedupe_key?: string; rename?: Record<string, string>; drop_columns?: string[] }
export interface PipeColumn { name: string; source: string; type: ColType; empty: number }
export interface Source {
  id: number; name: string; kind: Kind; config_public: Record<string, string>; clean: CleanOpts; schedule: Schedule;
  status: "new" | "running" | "ok" | "error"; columns: PipeColumn[]; last_rows: number | null; last_error: string | null;
  last_run_at: string | null; next_run_at: string | null; fail_count: number; notify_email: boolean; json_url: string; csv_url: string; created_at: string;
}
export interface Run {
  id: number; trigger: string; status: "running" | "ok" | "error"; rows_in: number | null; rows_out: number | null; dupes: number | null;
  empty_rows: number | null; fixed_values: number | null; ms: number | null; message: string | null; started_at: string; finished_at: string | null;
}
export interface Plan { sources: number; rows: number; schedules: Schedule[]; title: string }
export interface User { id: number; email: string; name: string | null; company: string | null; plan: "free" | "pro" | "corp"; plan_until: string | null }
export interface Stats { rows_in: number; rows_out: number; dupes: number; empty_rows: number; fixed_values: number }
export interface TestResult { ok: boolean; error?: string; note?: string; columns?: PipeColumn[]; preview?: Record<string, unknown>[]; stats?: Stats; ms?: number }

export const getToken = () => localStorage.getItem(TOKEN) || "";
export const setToken = (t: string) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN));

type R<T> = T & { error?: string; upgrade?: boolean };

export async function api<T>(action: string, body: Record<string, unknown> = {}, method: "GET" | "POST" = "POST"): Promise<R<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers["X-Session-Token"] = t;
  const url = method === "GET" ? `${PIPES_URL}/?${new URLSearchParams({ action, ...(body as Record<string, string>) })}` : `${PIPES_URL}/`;
  try {
    const r = await fetch(url, { method, headers, body: method === "POST" ? JSON.stringify({ action, ...body }) : undefined });
    const d = await r.json().catch(() => ({ error: "Сервер не ответил" }));
    if (r.status === 401 && t && action !== "verify") { setToken(""); window.dispatchEvent(new Event("pipes-logout")); }
    if (r.status >= 500 && !d.error) d.error = "Сервер временно недоступен, попробуйте ещё раз";
    return d;
  } catch {
    return { error: "Нет связи с сервером — проверьте интернет" } as R<T>;
  }
}

export const SCHEDULE_LABEL: Record<Schedule, string> = {
  manual: "Вручную", hourly: "Каждый час", every6h: "Каждые 6 часов", daily: "Раз в сутки", weekly: "Раз в неделю",
};

export function ago(iso: string | null): string {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 0) {
    const m = -s / 60;
    if (m < 60) return `через ${Math.max(1, Math.round(m))} мин`;
    if (m < 1440) return `через ${Math.round(m / 60)} ч`;
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  if (s < 60) return "только что";
  if (s < 3600) return `${Math.round(s / 60)} мин назад`;
  if (s < 86400) return `${Math.round(s / 3600)} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("ru-RU"));
