export const GRANTS_URL = "https://functions.poehali.dev/cd9f10b6-bd2b-4156-afc1-6aeb89fdbe43";

export interface Grant {
  id: string;
  name: string;
  fund: string;
  amount_fmt: string;
  category: string;
  deadline: string;
  region: string;
  url: string;
  description: string;
  matched_product: string;
  fit_score?: number;
  why_fit?: string;
  source?: string;
  saved?: boolean;
}

export interface Fund {
  key: string;
  name: string;
  icon: string;
  category: string;
  amount_hint: string;
  desc: string;
  url: string;
}

export interface SavedGrant extends Grant {
  db_id?: number;
  external_id: string;
  note: string;
  analysis: GrantAnalysis | null;
  created_at: string;
}

export interface GrantAnalysis {
  fit_score: number;
  win_probability: number;
  fit_comment: string;
  best_product: string;
  win_factors: string[];
  risks: string[];
  required_docs: string[];
  application_structure: { title: string; sections: { title: string; content: string }[] };
  budget_hint: string;
  timeline: string;
  conclusion: string;
}

export type Tab = "search" | "funds" | "saved" | "chat";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const QUICK = [
  "гранты на EdTech и образование",
  "импортозамещение российского ПО",
  "гранты на искусственный интеллект",
  "агротех и цифровизация АПК",
  "гранты для стартапов до 30 лет",
  "субсидии на промышленное ПО",
];

export function score(s?: number) {
  if (s == null) return "text-white/40";
  return s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-red-400";
}