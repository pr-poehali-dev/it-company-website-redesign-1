import Icon from "@/components/ui/icon";
import { Strategy } from "./types";

export default function StrategyView({ s }: { s: Strategy }) {
  const chance = s.win_probability ?? 0;
  const chanceCls = chance >= 70 ? "text-emerald-400" : chance >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-4">
      <div className="glass border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-white">Оценка перспектив</h3>
          <span className={`text-2xl font-bold ${chanceCls}`}>{chance}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${chance >= 70 ? "bg-emerald-500" : chance >= 40 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${chance}%` }}
          />
        </div>
        <p className="text-white/70 text-sm leading-relaxed">{s.assessment}</p>
      </div>

      {s.money_claim && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
            <Icon name="Coins" size={15} className="text-emerald-400" />
            Что можно взыскать
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Основной долг", value: s.money_claim.debt },
              { label: "Неустойка / проценты", value: s.money_claim.penalty },
              { label: "Госпошлина", value: s.money_claim.court_fee },
              { label: "Итого ориентировочно", value: s.money_claim.total_hint },
            ].map((x, i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-3">
                <p className="text-xs text-white/40 mb-1">{x.label}</p>
                <p className="text-sm text-white/80">{x.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.legal_grounds?.length > 0 && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
            <Icon name="BookOpen" size={15} className="text-violet-400" />
            Правовые основания
          </h3>
          <div className="space-y-2">
            {s.legal_grounds.map((g, i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-3">
                <p className="text-sm text-violet-300 font-medium mb-1">{g.norm}</p>
                <p className="text-sm text-white/60">{g.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.steps?.length > 0 && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
            <Icon name="ListChecks" size={15} className="text-cyan-400" />
            План действий
          </h3>
          <div className="space-y-3">
            {s.steps.map((st, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-white font-medium">{st.step}</p>
                    {st.deadline && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {st.deadline}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/55 mt-1">{st.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {s.evidence_needed?.length > 0 && (
          <div className="glass border border-white/10 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-3 text-sm">Собрать документы</h3>
            <ul className="space-y-2">
              {s.evidence_needed.map((e, i) => (
                <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                  <Icon name="FileCheck" size={13} className="mt-1 text-cyan-400 flex-shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.risks?.length > 0 && (
          <div className="glass border border-white/10 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-3 text-sm">Риски</h3>
            <ul className="space-y-2">
              {s.risks.map((r, i) => (
                <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                  <Icon name="TriangleAlert" size={13} className="mt-1 text-amber-400 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {s.settlement_option && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-2 text-sm flex items-center gap-2">
            <Icon name="Handshake" size={15} className="text-cyan-400" />
            Мировое соглашение
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">{s.settlement_option}</p>
        </div>
      )}

      {s.conclusion && (
        <div className="glass border border-violet-500/25 bg-violet-500/5 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-2 text-sm">Рекомендация</h3>
          <p className="text-white/80 text-sm leading-relaxed">{s.conclusion}</p>
        </div>
      )}
    </div>
  );
}
