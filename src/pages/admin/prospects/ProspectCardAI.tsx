import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prospect, scoreColor, PROSPECTS_URL } from "./types";

interface HHAnalysis {
  company_name: string;
  vacancies_found: number;
  hh_url: string;
  it_problems: { problem: string; evidence: string; solution: string; benefit: string }[];
  kp_block: string;
  recommended_services: string[];
  urgency: string;
  summary: string;
  raw_vacancies?: { title: string; area: string; url: string }[];
  error?: string;
}

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: "Срочно нужна помощь", color: "text-red-600 bg-red-50 border-red-200" },
  medium: { label: "Умеренная потребность", color: "text-amber-600 bg-amber-50 border-amber-200" },
  low:    { label: "Потенциальный интерес", color: "text-gray-500 bg-gray-50 border-gray-200" },
};

interface Props {
  prospect: Prospect;
  token: string;
  analyzing: boolean;
  onAnalyze: () => void;
  generatingMsg: boolean;
  generatedMsg: string;
  onMessage: (type: string) => void;
  onOpenKPForm: (kpBlock?: string) => void;
}

export default function ProspectCardAI({
  prospect, token, analyzing, onAnalyze,
  generatingMsg, generatedMsg, onMessage, onOpenKPForm,
}: Props) {
  const [hhLoading, setHhLoading] = useState(false);
  const [hhResult, setHhResult] = useState<HHAnalysis | null>(null);
  const [hhCopied, setHhCopied] = useState(false);

  async function handleAnalyzeHH() {
    setHhLoading(true);
    setHhResult(null);
    try {
      const res = await fetch(PROSPECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "analyze_hh",
          company_name: prospect.company_name,
          website: prospect.website || "",
        }),
      });
      const data = await res.json();
      setHhResult(data);
    } finally {
      setHhLoading(false);
    }
  }

  function copyKpBlock() {
    if (!hhResult?.kp_block) return;
    navigator.clipboard.writeText(hhResult.kp_block);
    setHhCopied(true);
    setTimeout(() => setHhCopied(false), 2000);
  }

  const urgencyConf = URGENCY_CONFIG[hhResult?.urgency || ""] || URGENCY_CONFIG.medium;

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

      {/* ── Анализ HH.ru ──────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Анализ HH.ru</span>
          <button
            onClick={handleAnalyzeHH}
            disabled={hhLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all disabled:opacity-40 font-medium"
          >
            {hhLoading
              ? <><Icon name="Loader2" size={12} className="animate-spin" />Анализирую вакансии...</>
              : <><Icon name="Briefcase" size={12} />Найти IT-боли по вакансиям</>}
          </button>
        </div>

        {hhResult && !hhResult.error && (
          <div className="space-y-3">
            {/* Шапка: кол-во вакансий + срочность + ссылка HH */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">
                Найдено вакансий: <strong className="text-gray-800">{hhResult.vacancies_found}</strong>
              </span>
              {hhResult.urgency && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${urgencyConf.color}`}>
                  {urgencyConf.label}
                </span>
              )}
              {hhResult.hh_url && (
                <a href={hhResult.hh_url} target="_blank" rel="noreferrer"
                  className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <Icon name="ExternalLink" size={11} />HH.ru
                </a>
              )}
            </div>

            {/* Краткий вывод */}
            {hhResult.summary && (
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">
                {hhResult.summary}
              </p>
            )}

            {/* IT-проблемы */}
            {hhResult.it_problems?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Выявленные IT-проблемы</p>
                {hhResult.it_problems.map((p, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 bg-white p-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Icon name="AlertCircle" size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-gray-800">{p.problem}</span>
                    </div>
                    <p className="text-xs text-gray-500 pl-5">
                      <span className="font-medium text-gray-600">Признак:</span> {p.evidence}
                    </p>
                    <p className="text-xs text-violet-700 pl-5">
                      <span className="font-medium">Решение МАТ-Лабс:</span> {p.solution}
                    </p>
                    <p className="text-xs text-emerald-700 pl-5">
                      <span className="font-medium">Выгода:</span> {p.benefit}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Рекомендуемые услуги */}
            {hhResult.recommended_services?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Предложить услуги</p>
                <div className="flex flex-wrap gap-1.5">
                  {hhResult.recommended_services.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs rounded-full font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Готовый блок для КП */}
            {hhResult.kp_block && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Готовый блок для КП</p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{hhResult.kp_block}</p>
                  <div className="flex gap-3 mt-2">
                    <button onClick={copyKpBlock}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium">
                      <Icon name={hhCopied ? "Check" : "Copy"} size={12} />
                      {hhCopied ? "Скопировано!" : "Копировать"}
                    </button>
                    <button onClick={() => onOpenKPForm(hhResult.kp_block)}
                      className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium">
                      <Icon name="Send" size={12} />Использовать в КП
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {hhResult?.error && (
          <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
            <Icon name="AlertCircle" size={13} />{hhResult.error}
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
                onClick={() => onOpenKPForm()}
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