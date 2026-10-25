export const CAMPAIGNS_URL = "https://functions.poehali.dev/bd7ee559-f6da-430f-875d-77e76193d2c9";

export interface EmailTemplate {
  code: string;
  title: string;
  audience: string;
  subject: string;
  body: string;
  followup_subject: string;
  followup_body: string;
  article_url: string;
}

export interface TemplateStats {
  total: number;
  with_email: number;
  sent: number;
  followups: number;
  followup_due: number;
  replied: number;
}

export interface CampaignItem {
  id: number;
  company_name: string;
  inn: string;
  region: string;
  email: string;
  phone: string;
  source_url: string;
  status: string;
  subsegment: string;
  campaign_template: string | null;
  grant_year: number | null;
  grant_source: string;
  rating_place: number | null;
  campaign_priority: number | null;
  campaign_step: number;
  campaign_followup_at: string | null;
}

export interface CampaignSettings {
  sender_name?: string;
  sender_phone?: string;
  daily_limit?: string;
  reply_to?: string;
}

export const PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "{company}", label: "Название компании" },
  { key: "{region}", label: "Регион" },
  { key: "{grant_year}", label: "Год гранта" },
  { key: "{grant_phrase}", label: "«Компания получила грант фонда в … году»" },
  { key: "{article_url}", label: "Ссылка на статью" },
  { key: "{multi_year_phrase_lead}", label: "«(Москва, поддержка 4 года из последних шести)»" },
  { key: "{regular_phrase}", label: "«регулярно» — если 3+ года или выплаты" },
  { key: "{rating_phrase}", label: "Место в рейтинге — для топ-20 АПК" },
];

export async function campaignsApi(token: string, action: string, body?: object, params?: Record<string, string>) {
  const isGet = !body;
  const url = isGet
    ? `${CAMPAIGNS_URL}/?${new URLSearchParams({ action, ...(params || {}) }).toString()}`
    : `${CAMPAIGNS_URL}/`;
  const res = await fetch(url, {
    method: isGet ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": token },
    body: isGet ? undefined : JSON.stringify({ action, ...body }),
  });
  return res.json();
}