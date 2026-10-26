export const ORDERS_URL = "https://functions.poehali.dev/9eca9b81-1847-4078-96fa-809e53ab1258";

export type OrderStatus = "new" | "invoiced" | "paid" | "sent";

export interface ReportOrder {
  id: number;
  report_type: "market" | "company" | "check" | "custom";
  report_key: string;
  report_title: string;
  price: number;
  name: string;
  phone: string;
  email: string;
  company: string;
  inn: string;
  comment: string;
  status: OrderStatus;
  created_at: string;
  pdf_url: string;
  xlsx_url: string;
  generated_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  invoiced_at: string | null;
  admin_note: string;
}

export interface OrdersResponse {
  items: ReportOrder[];
  by_status: Partial<Record<OrderStatus, { n: number; s: number }>>;
  test_count: number;
  error?: string;
}

export const STATUS_META: Record<OrderStatus, { label: string; cls: string; icon: string }> = {
  new: { label: "Новый", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: "Sparkles" },
  invoiced: { label: "Счёт выставлен", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: "Receipt" },
  paid: { label: "Оплачен", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: "Wallet" },
  sent: { label: "Отправлен", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30", icon: "MailCheck" },
};

export const STATUS_ORDER: OrderStatus[] = ["new", "invoiced", "paid", "sent"];

export const TYPE_LABEL: Record<string, string> = {
  market: "Рынок", company: "Компания", check: "Проверка", custom: "Исследование",
};

export const isTest = (o: ReportOrder) =>
  /тест/i.test(o.name) || /тест/i.test(o.report_title) || /^test@/i.test(o.email);

function token() {
  return localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
}

export async function ordersGet(params: Record<string, string>): Promise<OrdersResponse> {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  const res = await fetch(`${ORDERS_URL}/?${new URLSearchParams({ action: "list", ...clean })}`, { headers: { "X-Session-Token": token() } });
  return res.json();
}

export async function ordersPost<T = { ok?: boolean; error?: string }>(body: Record<string, unknown>): Promise<T & { ok?: boolean; error?: string }> {
  const res = await fetch(`${ORDERS_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": token() },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function fmtDT(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
