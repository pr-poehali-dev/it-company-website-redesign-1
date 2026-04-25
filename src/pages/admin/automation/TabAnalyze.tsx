import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AUTO_EMAILER_URL, ActionBtn, InfoBlock, ResultErr, SectionTitle } from "./automation-ui";

export default function TabAnalyze() {
  const [analyzeId, setAnalyzeId] = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{ ok: boolean; site_analysis?: string; site_pain_points?: string; error?: string } | null>(null);

  async function runAnalyze() {
    const id = parseInt(analyzeId);
    if (!id) return;
    setAnalyzeLoading(true);
    setAnalyzeResult(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_site", prospect_id: id }),
      });
      const data = await res.json();
      setAnalyzeResult(data);
    } catch {
      setAnalyzeResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setAnalyzeLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="Globe">Анализ сайта клиента</SectionTitle>
        <InfoBlock>
          AI анализирует сайт компании и извлекает боли: что продают, признаки хаоса
          в обработке заявок. Используется для генерации персональных писем.
          Результат сохраняется в карточку лида в CRM.
        </InfoBlock>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            value={analyzeId}
            onChange={e => setAnalyzeId(e.target.value)}
            placeholder="ID лида"
            className="w-36 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
            onKeyDown={e => e.key === "Enter" && runAnalyze()}
          />
          <ActionBtn onClick={runAnalyze} loading={analyzeLoading} disabled={!analyzeId} icon="Search">
            Анализировать сайт
          </ActionBtn>
        </div>
      </div>

      {analyzeResult && (
        analyzeResult.ok ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass border border-blue-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="FileSearch" size={14} className="text-blue-400" />
                <span className="text-sm font-semibold text-white">Анализ сайта</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                {analyzeResult.site_analysis || "Нет данных"}
              </p>
            </div>
            <div className="glass border border-orange-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="AlertTriangle" size={14} className="text-orange-400" />
                <span className="text-sm font-semibold text-white">Выявленные боли</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                {analyzeResult.site_pain_points || "Нет данных"}
              </p>
            </div>
          </div>
        ) : (
          <ResultErr>{analyzeResult.error ?? "Ошибка анализа"}</ResultErr>
        )
      )}
    </div>
  );
}
