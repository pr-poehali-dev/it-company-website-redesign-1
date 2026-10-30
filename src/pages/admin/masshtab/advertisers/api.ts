import func2url from "../../../../../backend/func2url.json";

export const ADV_URL = (func2url as Record<string, string>)["advertisers"];

export interface Segment {
  code: string; name: string; template: string;
  total?: number; with_email?: number; with_phone?: number; to_enrich?: number;
  sent?: number; followups?: number; followup_due?: number; replied?: number;
}
export interface AdvTemplate {
  code: string; title: string; audience: string; subject: string; body: string;
  followup_subject: string; followup_body: string;
}
export interface AdvSettings { sender_name?: string; sender_phone?: string; reply_to?: string; ads_daily_limit?: string | number }
export interface NightStats { date: string; runs: number; processed: number; email: number; phone: number; site: number; queue?: number }
export interface NightState { last_run: string | null; night: NightStats | null }
export interface Overview { segments: Segment[]; templates: AdvTemplate[]; sent_today: number; settings: AdvSettings; daily_limit: number; night?: NightState; cron_ready?: boolean }
export interface Advertiser {
  id: number; company_name: string; inn: string; region: string; subsegment: string;
  revenue: number | null; employee_count: number | null; email: string; phone: string; website: string;
  contact_name: string; contact_post: string; status: string; enrich_status: string; enrich_note: string;
  campaign_step: number; campaign_sent_at: string | null; campaign_followup_at: string | null; note: string;
}
export interface SendError { company: string; error: string }
export interface SendResp { sent: number; errors: SendError[]; skipped: number; left_today: number }
export interface Preview { company: string; email: string; subject: string; text: string; problems: string[] }

type Json = Record<string, unknown>;
type WithError<T> = Partial<T> & { error?: string };

export async function advGet<T>(token: string, action: string, params: Record<string, string | number | undefined> = {}): Promise<WithError<T>> {
  const q = new URLSearchParams({ action });
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
  try {
    const r = await fetch(`${ADV_URL}?${q.toString()}`, { headers: { "X-Session-Token": token } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok && !d.error) return { error: `Ошибка сервера (${r.status})` } as WithError<T>;
    return d as WithError<T>;
  } catch {
    return { error: "Нет связи с сервером" } as WithError<T>;
  }
}

export async function advPost<T>(token: string, action: string, body: Json = {}): Promise<WithError<T>> {
  try {
    const r = await fetch(ADV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ action, ...body }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok && !d.error) return { error: `Ошибка сервера (${r.status})` } as WithError<T>;
    return d as WithError<T>;
  } catch {
    return { error: "Нет связи с сервером" } as WithError<T>;
  }
}

export const n = (v: unknown) => Number(v) || 0;

export const STATUSES: [string, string][] = [
  ["new", "Новый"], ["contacted", "Написали"], ["interested", "Интерес"],
  ["negotiation", "Переговоры"], ["won", "Клиент"], ["lost", "Отказ"],
];

export const FILTERS: [string, string][] = [
  ["all", "Все"], ["with_email", "С почтой"], ["no_contacts", "Без контактов"], ["ready", "Готовы к рассылке"],
  ["sent", "Письмо отправлено"], ["followup_due", "Пора напомнить"], ["replied", "Ответили"],
];

export const ENRICH: Record<string, [string, string]> = {
  "": ["в очереди", "bg-white/10 text-white/60"],
  new: ["в очереди", "bg-white/10 text-white/60"],
  processing: ["ищем", "bg-cyan-500/15 text-cyan-300"],
  done: ["найдено", "bg-emerald-500/15 text-emerald-300"],
  empty: ["не найдено", "bg-amber-500/15 text-amber-300"],
  closed: ["ликвидирована", "bg-red-500/15 text-red-300"],
  error: ["ошибка", "bg-red-500/15 text-red-300"],
};

export function fmtDate(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

const CSV_HEAD = ["Компания", "ИНН", "Сегмент", "Регион", "Выручка, ₽", "Сотрудники", "Руководитель", "Должность", "Email", "Телефон", "Сайт", "Статус", "Писем отправлено"];
const CSV_KEYS = ["company_name", "inn", "subsegment", "region", "revenue", "employee_count", "contact_name", "contact_post", "email", "phone", "website", "status", "campaign_step"];

export function downloadCsv(rows: Json[], segNames: Record<string, string>) {
  const statusNames = Object.fromEntries(STATUSES);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_HEAD.join(";")];
  rows.forEach(r => {
    lines.push(CSV_KEYS.map(k => {
      const v = r[k];
      if (k === "subsegment") return esc(segNames[String(v || "")] || v);
      if (k === "status") return esc(statusNames[String(v || "")] || v);
      return esc(v);
    }).join(";"));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `advertisers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const btn = "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm disabled:opacity-50";
export const btnGhost = `${btn} border border-white/10 text-white/70 hover:text-white hover:bg-white/5`;
export const btnPrimary = `${btn} bg-violet-600 hover:bg-violet-500 text-white font-semibold`;
