import Icon from "@/components/ui/icon";
import { GrantAnalysis, score } from "./types";

export default function AnalysisView({ a }: { a: GrantAnalysis }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-white/40">Соответствие</p>
          <p className={`text-2xl font-bold ${score(a.fit_score)}`}>{a.fit_score}%</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Шанс выиграть</p>
          <p className={`text-2xl font-bold ${score(a.win_probability)}`}>{a.win_probability}%</p>
        </div>
      </div>

      {a.fit_comment && <p className="text-white/70">{a.fit_comment}</p>}
      {a.best_product && (
        <p className="text-cyan-300">
          <b>Заявлять продукт:</b> {a.best_product}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {a.win_factors?.length > 0 && (
          <div>
            <p className="text-emerald-300 font-medium mb-1 flex items-center gap-1">
              <Icon name="TrendingUp" size={14} /> Сильные стороны
            </p>
            <ul className="space-y-1">
              {a.win_factors.map((f, i) => (
                <li key={i} className="text-white/60 flex gap-1.5">
                  <span className="text-emerald-400">+</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
        {a.risks?.length > 0 && (
          <div>
            <p className="text-amber-300 font-medium mb-1 flex items-center gap-1">
              <Icon name="AlertTriangle" size={14} /> Риски
            </p>
            <ul className="space-y-1">
              {a.risks.map((r, i) => (
                <li key={i} className="text-white/60 flex gap-1.5">
                  <span className="text-amber-400">!</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {a.required_docs?.length > 0 && (
        <div>
          <p className="text-white/80 font-medium mb-1">Нужные документы</p>
          <div className="flex flex-wrap gap-2">
            {a.required_docs.map((d, i) => (
              <span key={i} className="text-xs bg-white/5 text-white/60 px-2 py-1 rounded-lg">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {a.application_structure?.sections?.length > 0 && (
        <div>
          <p className="text-white/80 font-medium mb-2">
            Структура заявки: <span className="text-violet-300">{a.application_structure.title}</span>
          </p>
          <div className="space-y-2">
            {a.application_structure.sections.map((s, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-3">
                <p className="text-white/90 font-medium text-xs mb-1">{s.title}</p>
                <p className="text-white/55 text-xs leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {a.budget_hint && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 mb-1">Обоснование бюджета</p>
            <p className="text-white/70 text-xs">{a.budget_hint}</p>
          </div>
        )}
        {a.timeline && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 mb-1">Сроки реализации</p>
            <p className="text-white/70 text-xs">{a.timeline}</p>
          </div>
        )}
      </div>

      {a.conclusion && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
          <p className="text-xs text-violet-300 mb-1 font-medium">Рекомендация ИИ</p>
          <p className="text-white/80 text-sm">{a.conclusion}</p>
        </div>
      )}
    </div>
  );
}
