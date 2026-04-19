import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Tender, Analysis, sourceColor, sc, sb } from "./types";

interface TenderAnalysisPanelProps {
  selected: Tender | null;
  analysis: Analysis | null;
  analyzing: boolean;
  analyzeError: string;
  savingId: string | null;
  onClose: () => void;
  onAnalyze: (t: Tender) => void;
  onSave: (t: Tender, a: Analysis | null) => void;
}

export default function TenderAnalysisPanel({
  selected, analysis, analyzing, analyzeError, savingId, onClose, onAnalyze, onSave,
}: TenderAnalysisPanelProps) {
  const [kpExpanded, setKpExpanded] = useState(false);

  if (!selected) return (
    <div className="glass neon-border rounded-2xl p-8 text-center sticky top-24">
      <Icon name="MousePointerClick" size={36} className="text-white/10 mx-auto mb-3" />
      <p className="text-white/30 text-sm">Выберите тендер для ИИ-анализа</p>
    </div>
  );

  return (
    <div className="space-y-4 sticky top-24 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">

      {/* Tender info */}
      <div className="glass neon-border rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${sourceColor(selected.source)}`}>{selected.source}</span>
          <button onClick={onClose} className="text-white/30 hover:text-white">
            <Icon name="X" size={14} />
          </button>
        </div>
        <p className="text-white font-medium text-sm leading-snug mb-3">{selected.name}</p>
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          {[["НМЦ", selected.price_fmt], ["Закон", selected.law], ["Срок", selected.end_date], ["Регион", selected.region]].map(([l, v]) => (
            <div key={l} className="glass rounded-lg p-2">
              <div className="text-white/30 mb-0.5">{l}</div>
              <div className="text-white font-medium truncate">{v}</div>
            </div>
          ))}
        </div>
        <div className="glass rounded-lg p-2 text-xs">
          <div className="text-white/30 mb-0.5">Заказчик</div>
          <div className="text-white">{selected.customer}</div>
        </div>
        {!analysis && !analyzing && (
          <button
            onClick={() => onAnalyze(selected)}
            className="w-full mt-3 py-2.5 btn-gradient rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          >
            <Icon name="Sparkles" size={15} /> Запустить ИИ-анализ
          </button>
        )}
      </div>

      {/* Analyzing */}
      {analyzing && (
        <div className="glass neon-border rounded-2xl p-6 text-center space-y-3">
          <Icon name="Sparkles" size={28} className="text-violet-400 mx-auto animate-pulse" />
          <p className="text-white font-medium text-sm">Анализирую тендер...</p>
          {["Читаю условия", "Оцениваю шансы", "Готовлю структуру КП"].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/40">
              <Icon name="Loader2" size={11} className="animate-spin flex-shrink-0" />{s}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {analyzeError && (
        <div className="glass border border-red-500/30 rounded-2xl p-4">
          <p className="text-red-400 text-sm mb-2">{analyzeError}</p>
          <button onClick={() => onAnalyze(selected)} className="text-violet-400 text-xs hover:underline">Повторить</button>
        </div>
      )}

      {/* Analysis results */}
      {analysis && (
        <>
          {/* Scores */}
          <div className="glass neon-border rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              {([["Релевантность", analysis.relevance_score, ""], ["Шанс победы", analysis.win_probability, "%"]] as [string, number, string][]).map(([label, val, sfx]) => (
                <div key={label} className="text-center">
                  <div className={`text-2xl font-bold font-oswald ${sc(val)}`}>{val}{sfx}</div>
                  <div className="text-white/40 text-xs mt-0.5">{label}</div>
                  <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
                    <div className={`h-1 rounded-full ${sb(val)}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-white/60 text-xs leading-relaxed">{analysis.relevance_comment}</p>
          </div>

          {/* Conclusion */}
          <div className={`glass rounded-2xl p-4 border ${analysis.win_probability >= 50 ? "border-emerald-500/30" : "border-amber-500/30"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon
                name={analysis.win_probability >= 50 ? "CheckCircle" : "AlertTriangle"}
                size={14}
                className={analysis.win_probability >= 50 ? "text-emerald-400" : "text-amber-400"}
              />
              <span className={`text-xs font-semibold ${analysis.win_probability >= 50 ? "text-emerald-400" : "text-amber-400"}`}>Вывод ИИ</span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">{analysis.conclusion}</p>
          </div>

          {/* Factors & Risks */}
          <div className="grid grid-cols-2 gap-3">
            {([
              ["TrendingUp", "text-emerald-400", "Факторы победы", analysis.win_factors, "✓", "text-emerald-400"],
              ["ShieldAlert", "text-amber-400",  "Риски",          analysis.risks,       "!", "text-amber-400"],
            ] as [string, string, string, string[], string, string][]).map(([icon, ic, title, items, mark, mc]) => (
              <div key={title} className="glass neon-border rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon name={icon as "TrendingUp"} size={12} className={ic} />
                  <span className="text-xs font-semibold text-white">{title}</span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-white/60">
                      <span className={`${mc} flex-shrink-0`}>{mark}</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="glass neon-border rounded-2xl p-4 space-y-2 text-xs">
            {([
              ["Tag",   "Цена",    analysis.recommended_price],
              ["Clock", "Сроки",   analysis.timeline],
              ["Users", "Команда", analysis.team],
            ] as [string, string, string][]).map(([icon, label, val]) => (
              <div key={label} className="flex items-start gap-2">
                <Icon name={icon as "Tag"} size={12} className="text-violet-400 flex-shrink-0 mt-0.5" />
                <div><span className="text-white/40">{label}: </span><span className="text-white/80">{val}</span></div>
              </div>
            ))}
            {analysis.key_requirements.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {analysis.key_requirements.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 glass border border-white/10 text-white/50 rounded-lg">{r}</span>
                ))}
              </div>
            )}
          </div>

          {/* KP */}
          <div className="glass neon-border rounded-2xl overflow-hidden">
            <button onClick={() => setKpExpanded(e => !e)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all">
              <div className="flex items-center gap-2">
                <Icon name="FileText" size={14} className="text-violet-400" />
                <span className="text-white text-sm font-semibold">Структура КП</span>
              </div>
              <Icon name={kpExpanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-white/40" />
            </button>
            {kpExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                <p className="text-violet-300 text-xs font-semibold">{analysis.kp_structure.title}</p>
                {analysis.kp_structure.sections.map((s, i) => (
                  <div key={i} className="glass rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-white text-xs font-medium">{s.title}</span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed pl-6">{s.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onSave(selected, analysis)}
              disabled={selected.saved || savingId === selected.id}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${selected.saved ? "bg-amber-500/20 text-amber-400" : "glass border border-white/10 hover:border-amber-500/40 text-white/60 hover:text-amber-400"}`}
            >
              {savingId === selected.id ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Bookmark" size={13} />}
              {selected.saved ? "В избранном" : "Сохранить"}
            </button>
            <a
              href={selected.url} target="_blank" rel="noreferrer"
              className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-xs text-white/60 hover:text-white flex items-center justify-center gap-1.5 transition-all"
            >
              <Icon name="ExternalLink" size={13} /> Открыть
            </a>
            <button onClick={() => onAnalyze(selected)} className="py-2.5 px-3 glass border border-white/10 text-white/30 hover:text-white rounded-xl transition-all">
              <Icon name="RefreshCw" size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
