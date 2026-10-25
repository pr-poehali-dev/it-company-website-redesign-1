export const ENRICH_URL = "https://functions.poehali.dev/20860635-2c65-4f0f-a935-45ea680e49aa";

export interface EnrichStats {
  total: number;
  processed: number;
  queue: number;
  verify_queue: number;
  with_head: number;
  egrul_done: number;
  with_site: number;
  site_high: number;
  with_email: number;
  with_phone: number;
  with_contact: number;
  closed: number;
  errors: number;
  fresh_total: number;
  fresh_contact: number;
  processed_24h: number;
}

export interface EnrichRow {
  inn: string;
  name: string;
  region: string;
  industry: string;
  total_amount: number;
  last_date: string | null;
  head: string;
  head_post: string;
  website: string;
  website_confidence: string;
  emails: string;
  phones: string;
  enrich_status: string;
  enrich_note: string;
  contacts_source: string;
  enriched_at: string | null;
}

export interface RunRow {
  hour: string;
  trigger: string;
  processed: number;
  site: number;
  email: number;
  phone: number;
  head: number;
  errors: number;
  batches: number;
}

export type Stage = "egrul" | "search" | "verify";

function token() {
  return localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
}

export async function enrichCall<T = Record<string, unknown>>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${ENRICH_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": token() },
    body: JSON.stringify(body),
    signal,
  });
  return res.json();
}
