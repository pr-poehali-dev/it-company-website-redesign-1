import Icon from "@/components/ui/icon";

export const AUTO_EMAILER_URL = "https://functions.poehali.dev/977f553d-a834-4fba-9f2f-349939384e9e";
export const FOLLOWUP_URL = "https://functions.poehali.dev/b11d9fef-38cd-4721-9bb3-4d7e7d97927f";
export const RADAR_URL = "https://functions.poehali.dev/2725883d-2720-4230-8bac-e2703f726abc";
export const CRON_URL = "https://functions.poehali.dev/e57ad53d-52a4-4403-b952-a44b6a2f496d";
export const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export const REGIONS = [
  "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск",
  "Краснодар", "Казань", "Нижний Новгород", "Самара",
];
export const INDUSTRIES = [
  "Все", "маркетинг и реклама", "медицина и клиники",
  "образование и курсы", "торговля и e-commerce", "юридические услуги",
];

export type Tab = "emailer" | "followup" | "radar" | "analyze";

export interface Task {
  id: string;
  prospect_id: string;
  task_type: string;
  scheduled_at: string;
  executed_at: string | null;
  status: string;
  ai_subject: string | null;
  error_msg: string | null;
  created_at: string;
  company_name: string | null;
  email: string | null;
  prospect_status: string | null;
}

export interface RadarRun {
  id: string;
  region: string;
  industry: string;
  found: number;
  inserted: number;
  skipped: number;
  trigger_type: string;
  started_at: string;
  finished_at: string | null;
  error_msg: string | null;
}

export const TASK_STATUS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  sent: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
  skipped: "bg-white/10 text-white/40 border-white/10",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  sent: "Отправлено",
  failed: "Ошибка",
  skipped: "Пропущено",
};

export function fmtAgo(iso: string | null): string {
  if (!iso) return "никогда";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 2) return "только что";
  if (diff < 60) return `${diff} мин. назад`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч. назад`;
  return `${Math.floor(h / 24)} д. назад`;
}

export function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function StatusBadge({ status, map, labelMap }: { status: string; map: Record<string, string>; labelMap: Record<string, string> }) {
  const cls = map[status] ?? "bg-white/10 text-white/40 border-white/10";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

export function ResultOk({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm">
      <Icon name="CheckCircle" size={15} />
      {children}
    </div>
  );
}

export function ResultErr({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm">
      <Icon name="XCircle" size={15} />
      {children}
    </div>
  );
}

export function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon name={icon as "Mail"} size={16} className="text-violet-400" />
      <span className="font-oswald font-bold text-white text-sm">{children}</span>
    </div>
  );
}

export function ActionBtn({
  onClick, loading, disabled, icon, children, variant = "primary",
}: {
  onClick: () => void; loading: boolean; disabled?: boolean;
  icon: string; children: React.ReactNode; variant?: "primary" | "ghost";
}) {
  const base = "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const cls = variant === "primary"
    ? `${base} bg-violet-600 hover:bg-violet-500 text-white`
    : `${base} glass border border-white/10 hover:border-white/30 text-white/70 hover:text-white`;
  return (
    <button onClick={onClick} disabled={loading || disabled} className={cls}>
      {loading
        ? <><Icon name="Loader2" size={14} className="animate-spin" />Работаю...</>
        : <><Icon name={icon as "Mail"} size={14} />{children}</>}
    </button>
  );
}

export function InfoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white/50 leading-relaxed mb-5">
      {children}
    </div>
  );
}
