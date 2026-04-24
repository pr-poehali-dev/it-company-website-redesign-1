export const AGENT_URL = "https://functions.poehali.dev/401fd6b1-332e-454e-a93d-f90b30785044";

export interface PipelineHealth {
  score: number;
  verdict: string;
  comment: string;
}

export interface Opportunity {
  company: string;
  reason: string;
  action: string;
}

export interface Risk {
  company: string;
  risk: string;
  mitigation: string;
}

export interface Strategy {
  focus: string;
  channels: string[];
  messaging: string;
  timeline: string;
}

export interface Segment {
  name: string;
  count: number;
  approach: string;
}

export interface StrategyReport {
  executive_summary: string;
  pipeline_health: PipelineHealth;
  top_opportunities: Opportunity[];
  risks: Risk[];
  strategy: Strategy;
  quick_wins: string[];
  segments: Segment[];
}

export interface LeadRec {
  company: string;
  status: string;
  segment?: string;
  warm_signals?: string;
  next_step: string;
  email_subject: string;
  email_body: string;
  call_script: string;
  offer: string;
  timing: string;
}

export interface Report {
  generated_at: string;
  total_prospects: number;
  strategy: StrategyReport;
  leads_recommendations: LeadRec[];
}

export interface RadarSignal {
  company_name: string;
  inn: string;
  region: string;
  industry: string;
  tech_tags: string[];
  signal: string;
  potential: string;
  website: string;
  source: string;
  ai_score?: number;
  ai_summary?: string;
  ai_reasons?: string[];
  next_action?: string;
}

export interface RadarToCrmResult {
  ok: boolean;
  error?: string;
  radar_summary: string;
  hot_industries: string[];
  regional_trends: string[];
  total_found: number;
  inserted: number;
  skipped: number;
  errors: number;
  signals: RadarSignal[];
}

export const VERDICT_COLOR: Record<string, string> = {
  "отлично": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "хорошо": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  "требует внимания": "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "критично": "text-red-400 bg-red-500/10 border-red-500/30",
};

export const TIMING_COLOR: Record<string, string> = {
  "сегодня": "text-red-400 bg-red-500/10",
  "эта неделя": "text-amber-400 bg-amber-500/10",
  "следующая неделя": "text-cyan-400 bg-cyan-500/10",
};
