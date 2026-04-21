import Icon from "@/components/ui/icon";
import { Prospect, scoreColor } from "./types";

interface Props {
  prospect: Prospect;
  analyzing: boolean;
  onAnalyze: () => void;
  generatingMsg: boolean;
  generatedMsg: string;
  onMessage: (type: string) => void;
  onOpenKPForm: () => void;
}

export default function ProspectCardAI({
  prospect, analyzing, onAnalyze,
  generatingMsg, generatedMsg, onMessage, onOpenKPForm,
}: Props) {
  return (
    <>
      {/* ── ИИ-анализ ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ИИ-анализ</span>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-all disabled:opacity-40 font-medium"
          >
            {analyzing
              ? <><Icon name="Loader2" size={12} className="animate-spin" />Анализирую...</>
              : <><Icon name="Sparkles" size={12} />Проанализировать</>}
          </button>
        </div>
        {prospect.ai_summary && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className={`text-xl font-bold ${scoreColor(prospect.ai_score)}`}>{prospect.ai_score}/100</div>
              <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (prospect.ai_score ?? 0) >= 70 ? "bg-emerald-500" : (prospect.ai_score ?? 0) >= 40 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${prospect.ai_score}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{prospect.ai_summary}</p>
            {prospect.ai_reasons?.length > 0 && (
              <ul className="space-y-1 pt-1">
                {prospect.ai_reasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                    <Icon name="ChevronRight" size={12} className="text-violet-500 flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Генератор текста ──────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-50 space-y-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Генератор текста</span>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "email", label: "Письмо", icon: "Mail" },
            { key: "call", label: "Скрипт звонка", icon: "Phone" },
            { key: "linkedin", label: "LinkedIn", icon: "MessageCircle" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => onMessage(t.key)}
              disabled={generatingMsg}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-40"
            >
              <Icon name={t.icon as "Mail"} size={13} />
              {t.label}
            </button>
          ))}
        </div>
        {generatingMsg && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Icon name="Loader2" size={13} className="animate-spin" />Генерирую...
          </div>
        )}
        {generatedMsg && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{generatedMsg}</pre>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => navigator.clipboard.writeText(generatedMsg)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                <Icon name="Copy" size={12} />Копировать
              </button>
              <button
                onClick={onOpenKPForm}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                <Icon name="Send" size={12} />Отправить как КП
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
