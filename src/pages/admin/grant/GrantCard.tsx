import Icon from "@/components/ui/icon";
import AnalysisView from "./AnalysisView";
import { Grant, GrantAnalysis, score } from "./types";

export default function GrantCard({
  g,
  onAnalyze,
  onSave,
  expanded,
  analysis,
  analyzing,
}: {
  g: Grant;
  onAnalyze: () => void;
  onSave: () => void;
  expanded: boolean;
  analysis: GrantAnalysis | null;
  analyzing: boolean;
}) {
  return (
    <div className="glass border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-white">{g.name}</h3>
            {g.fit_score != null && (
              <span className={`text-xs font-bold ${score(g.fit_score)}`}>{g.fit_score}% подходит</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
            <span className="text-white/60 flex items-center gap-1">
              <Icon name="Building2" size={12} />
              {g.fund}
            </span>
            {g.amount_fmt && (
              <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">{g.amount_fmt}</span>
            )}
            {g.category && <span className="text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full">{g.category}</span>}
            {g.deadline && (
              <span className="text-amber-300 flex items-center gap-1">
                <Icon name="Clock" size={12} />
                {g.deadline}
              </span>
            )}
          </div>
          <p className="text-white/55 text-sm leading-relaxed mb-2">{g.description}</p>
          {g.matched_product && (
            <p className="text-xs text-cyan-300 flex items-center gap-1">
              <Icon name="Boxes" size={12} />
              Наш продукт: <b className="text-cyan-200">{g.matched_product}</b>
            </p>
          )}
          {g.why_fit && <p className="text-xs text-white/40 mt-1 italic">{g.why_fit}</p>}
        </div>
        <button
          onClick={onSave}
          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            g.saved ? "bg-violet-600 text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
          }`}
          title={g.saved ? "В избранном" : "Сохранить"}
        >
          <Icon name={g.saved ? "BookmarkCheck" : "Bookmark"} size={16} />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onAnalyze}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 text-sm font-medium transition-all"
        >
          <Icon name="BrainCircuit" size={14} />
          ИИ-анализ заявки
        </button>
        {g.url && (
          <a
            href={g.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/15 text-white/70 hover:text-white text-sm font-medium transition-all"
          >
            <Icon name="ExternalLink" size={14} />
            Перейти к гранту
          </a>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {analyzing && (
            <div className="flex items-center text-white/40 text-sm py-4">
              <Icon name="Loader2" size={18} className="animate-spin mr-2" />
              ИИ анализирует шансы и готовит структуру заявки...
            </div>
          )}
          {!analyzing && analysis && <AnalysisView a={analysis} />}
        </div>
      )}
    </div>
  );
}
