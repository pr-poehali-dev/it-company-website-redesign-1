import Icon from "@/components/ui/icon";
import { Project, Prospect, STATUSES, scoreColor, scoreBg } from "./types";

interface Props {
  prospects: Prospect[];
  projects: Project[];
  statusStats: Record<string, number>;
  totalProspects: number;
  wonCount: number;
  newCount: number;
  highPriority: number;
  avgScore: number | null;
  onSelectProspect: (p: Prospect) => void;
  onSwitchToCrm: () => void;
}

export default function ProspectAnalyticsTab({
  prospects, projects, statusStats, totalProspects,
  wonCount, newCount, highPriority, avgScore,
  onSelectProspect, onSwitchToCrm,
}: Props) {
  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Всего компаний", val: totalProspects, icon: "Users", color: "text-violet-400" },
          { label: "Клиенты (Won)", val: wonCount, icon: "Trophy", color: "text-emerald-400" },
          { label: "Новые", val: newCount, icon: "Sparkles", color: "text-blue-400" },
          { label: "Высокий приоритет", val: highPriority, icon: "Flame", color: "text-red-400" },
        ].map((k, i) => (
          <div key={i} className="glass neon-border rounded-2xl p-4">
            <Icon name={k.icon as "Users"} size={20} className={k.color + " mb-2"} />
            <div className="text-2xl font-bold text-white">{k.val}</div>
            <div className="text-xs text-white/40 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Средний AI-score */}
      {avgScore !== null && (
        <div className="glass neon-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/60">Средний ИИ-рейтинг клиентов</span>
            <span className={`text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore}/100</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${scoreBg(avgScore)}`} style={{ width: `${avgScore}%` }} />
          </div>
        </div>
      )}

      {/* По статусам */}
      <div className="glass neon-border rounded-2xl p-5">
        <h3 className="font-oswald font-bold text-white mb-4">Воронка продаж</h3>
        <div className="space-y-2">
          {STATUSES.map(s => {
            const cnt = statusStats[s.key] || 0;
            const pct = totalProspects > 0 ? Math.round((cnt / totalProspects) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className="w-28 text-xs text-right text-white/50 flex-shrink-0">{s.label}</div>
                <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg bg-violet-600/50 flex items-center pl-2 transition-all"
                    style={{ width: `${Math.max(pct, cnt > 0 ? 5 : 0)}%` }}>
                    {cnt > 0 && <span className="text-xs text-white font-semibold">{cnt}</span>}
                  </div>
                </div>
                <div className="w-10 text-xs text-white/30 flex-shrink-0">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* По проектам */}
      {projects.length > 0 && (
        <div className="glass neon-border rounded-2xl p-5">
          <h3 className="font-oswald font-bold text-white mb-4">По проектам</h3>
          <div className="space-y-3">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <div className="flex-1 text-sm text-white/70">{p.name}</div>
                <div className="text-sm font-bold text-white">{p.prospect_count}</div>
                <div className="text-xs text-white/30">компаний</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Топ по ИИ-рейтингу */}
      {prospects.filter(p => p.ai_score !== null).length > 0 && (
        <div className="glass neon-border rounded-2xl p-5">
          <h3 className="font-oswald font-bold text-white mb-4">Топ-5 по ИИ-рейтингу</h3>
          <div className="space-y-2">
            {[...prospects]
              .filter(p => p.ai_score !== null)
              .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
              .slice(0, 5)
              .map((p, i) => (
                <div key={p.id} onClick={() => { onSelectProspect(p); onSwitchToCrm(); }}
                  className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-xl p-2 transition-all">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-white/40">
                    {i + 1}
                  </div>
                  <div className="flex-1 text-sm text-white">{p.company_name}</div>
                  <div className={`text-sm font-bold ${scoreColor(p.ai_score)}`}>{p.ai_score}</div>
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBg(p.ai_score)}`} style={{ width: `${p.ai_score}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
