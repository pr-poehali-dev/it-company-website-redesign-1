export const LEGAL_URL = "https://functions.poehali.dev/401fd6b1-332e-454e-a93d-f90b30785044";

export interface LegalCase {
  id: number;
  title: string;
  case_type: string;
  opponent: string;
  opponent_inn: string;
  amount: number;
  status: string;
  description: string;
  contract_text: string;
  strategy: Strategy | null;
  next_step: string;
  docs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LegalMessage {
  id: number;
  case_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface LegalDocument {
  id: number;
  case_id: number;
  doc_type: string;
  title: string;
  content: string;
  created_at: string;
}

export interface ContractRisk {
  clause: string;
  risk: string;
  severity: string;
  fix: string;
}

export interface ContractAnalysis {
  summary: string;
  risk_level: string;
  risk_score: number;
  risks: ContractRisk[];
  missing: string[];
  payment_terms: string;
  our_leverage: string[];
  recommendations: string[];
}

export interface Strategy {
  win_probability: number;
  assessment: string;
  legal_grounds: { norm: string; why: string }[];
  evidence_needed: string[];
  money_claim: {
    debt: string;
    penalty: string;
    court_fee: string;
    total_hint: string;
  };
  steps: { step: string; deadline: string; detail: string }[];
  risks: string[];
  settlement_option: string;
  conclusion: string;
}

export const CASE_TYPES: Record<string, string> = {
  debt: "Долг / неоплата",
  contract: "Спор по договору",
  shares: "Раздел бизнеса / доли",
  ip: "Интеллектуальная собственность",
  other: "Иное",
};

export const CASE_STATUSES: { key: string; label: string; cls: string }[] = [
  { key: "new", label: "Новое", cls: "bg-white/10 text-white/60 border-white/15" },
  { key: "claim", label: "Претензия", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { key: "court", label: "Суд", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { key: "won", label: "Выиграно", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { key: "settled", label: "Урегулировано", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  { key: "lost", label: "Проиграно", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
];

export const DOC_TYPE_LABELS: Record<string, string> = {
  offer: "Коммерческое предложение",
  contract: "Договор на оказание услуг",
  objection: "Возражения на иск / ходатайство",
  calculation: "Контррасчёт неустойки и процентов",
  claim: "Досудебная претензия",
  lawsuit: "Исковое заявление",
  agreement: "Соглашение о рассрочке",
  demand: "Требование о документах",
  reply: "Ответ на претензию",
  termination: "Отказ от договора",
};

export const QUICK_QUESTIONS = [
  "Контрагент не платит за выполненные работы — с чего начать взыскание?",
  "Как правильно составить претензию, чтобы её приняли в суде?",
  "Акты не подписаны, работы приняты по факту — можно ли взыскать оплату?",
  "Как рассчитать неустойку и проценты по ст. 395 ГК РФ?",
  "Какие документы собрать для иска в арбитражный суд?",
  "Стоит ли идти на мировое соглашение с должником?",
];

export function statusInfo(key: string) {
  return CASE_STATUSES.find(s => s.key === key) || CASE_STATUSES[0];
}

export function fmtMoney(n: number | string) {
  const v = Number(n) || 0;
  return v.toLocaleString("ru-RU") + " ₽";
}

export function riskColor(level: string) {
  if (level === "высокий") return "text-red-400";
  if (level === "средний") return "text-amber-400";
  return "text-emerald-400";
}

export function severityCls(s: string) {
  if (s === "высокая") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (s === "средняя") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-white/10 text-white/50 border-white/15";
}