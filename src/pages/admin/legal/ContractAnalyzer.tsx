import { useState } from "react";
import Icon from "@/components/ui/icon";
import { LEGAL_URL, ContractAnalysis, riskColor, severityCls } from "./types";

export default function ContractAnalyzer({
  token,
  caseId,
}: {
  token: string;
  caseId: number | null;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [a, setA] = useState<ContractAnalysis | null>(null);

  async function analyze() {
    if (text.trim().length < 100) {
      setError("Вставьте текст договора — минимум 100 символов");
      return;
    }
    setLoading(true);
    setError("");
    setA(null);
    try {
      const res = await fetch(LEGAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "legal_analyze", text, case_id: caseId }),
      });
      const d = await res.json();
      if (d.analysis) setA(d.analysis);
      else setError(d.error || "Не удалось проанализировать");
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass border border-white/10 rounded-2xl p-5">
        <p className="text-sm text-white/50 mb-3">
          Вставьте текст договора — найду рискованные пункты, пробелы и наши сильные позиции
          для взыскания оплаты.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder="Вставьте сюда полный текст договора..."
          className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-y font-mono"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-white/30">{text.length} символов</span>
          <button
            onClick={analyze}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
          >
            {loading ? (
              <>
                <Icon name="Loader2" size={14} className="animate-spin" />
                Анализирую договор...
              </>
            ) : (
              <>
                <Icon name="ScanSearch" size={14} />
                Проверить на риски
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm">
            <Icon name="XCircle" size={15} />
            {error}
          </div>
        )}
      </div>

      {a && (
        <div className="space-y-4">
          <div className="glass border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-semibold text-white">Итог по договору</h3>
              <span className={`text-sm font-bold ${riskColor(a.risk_level)}`}>
                Риск: {a.risk_level} ({a.risk_score}/100)
              </span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{a.summary}</p>
            {a.payment_terms && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/40 mb-1">Оплата и приёмка</p>
                <p className="text-white/70 text-sm leading-relaxed">{a.payment_terms}</p>
              </div>
            )}
          </div>

          {a.risks?.length > 0 && (
            <div className="glass border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Icon name="TriangleAlert" size={16} className="text-amber-400" />
                Рискованные пункты ({a.risks.length})
              </h3>
              <div className="space-y-3">
                {a.risks.map((r, i) => (
                  <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-white/80 font-medium">{r.clause}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${severityCls(r.severity)}`}>
                        {r.severity}
                      </span>
                    </div>
                    <p className="text-sm text-red-300/80 mb-2">{r.risk}</p>
                    <p className="text-sm text-emerald-300/80 flex items-start gap-1.5">
                      <Icon name="Wrench" size={13} className="mt-0.5 flex-shrink-0" />
                      {r.fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {a.missing?.length > 0 && (
              <div className="glass border border-white/10 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-3 text-sm">Чего не хватает</h3>
                <ul className="space-y-2">
                  {a.missing.map((m, i) => (
                    <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                      <Icon name="Minus" size={13} className="mt-1 text-red-400 flex-shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {a.our_leverage?.length > 0 && (
              <div className="glass border border-white/10 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-3 text-sm">Наши сильные позиции</h3>
                <ul className="space-y-2">
                  {a.our_leverage.map((m, i) => (
                    <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                      <Icon name="Check" size={13} className="mt-1 text-emerald-400 flex-shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {a.recommendations?.length > 0 && (
            <div className="glass border border-violet-500/20 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <Icon name="ListChecks" size={15} className="text-violet-400" />
                Что сделать
              </h3>
              <ol className="space-y-2">
                {a.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
