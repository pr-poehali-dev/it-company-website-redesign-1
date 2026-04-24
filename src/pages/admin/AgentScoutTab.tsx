import { useState } from "react";
import Icon from "@/components/ui/icon";
import { REGIONS, INDUSTRIES, TECH_TAG_COLORS, POTENTIAL_CONFIG } from "./prospects/TechRadarTypes";
import { RadarToCrmResult, RadarSignal } from "./AgentTypes";

interface Props {
  token: string;
  scoutRegion: string;
  scoutIndustry: string;
  scoutEnrich: boolean;
  scoutLoading: boolean;
  scoutStep: "idle" | "radar" | "enrich" | "save" | "done";
  scoutResult: RadarToCrmResult | null;
  scoutError: string;
  onRegionChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onEnrichChange: (v: boolean) => void;
  onRun: () => void;
}

const SCOUT_STEPS = [
  { key: "radar", label: "Радар ищет компании", icon: "Radar" },
  { key: "enrich", label: "AI обогащает данные", icon: "BrainCircuit" },
  { key: "save", label: "Сохраняю в CRM", icon: "DatabaseZap" },
];

export default function AgentScoutTab({
  scoutRegion,
  scoutIndustry,
  scoutEnrich,
  scoutLoading,
  scoutStep,
  scoutResult,
  scoutError,
  onRegionChange,
  onIndustryChange,
  onEnrichChange,
  onRun,
}: Props) {
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const currentStepIdx = SCOUT_STEPS.findIndex(s => s.key === scoutStep);

  return (
    <div className="space-y-5">
      {/* Форма */}
      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Icon name="Radar" size={16} className="text-violet-400" />
          <span className="text-sm font-semibold text-white">Настройки разведки</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Регион</label>
            <select
              value={scoutRegion}
              onChange={e => onRegionChange(e.target.value)}
              disabled={scoutLoading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              {REGIONS.map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Отрасль</label>
            <select
              value={scoutIndustry}
              onChange={e => onIndustryChange(e.target.value)}
              disabled={scoutLoading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              {INDUSTRIES.map(i => <option key={i} value={i} className="bg-gray-900">{i}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => !scoutLoading && onEnrichChange(!scoutEnrich)}
              className={`w-10 h-5 rounded-full transition-colors relative ${scoutEnrich ? "bg-violet-600" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${scoutEnrich ? "left-5" : "left-0.5"}`} />
            </div>
            <div>
              <span className="text-sm text-white">AI-обогащение</span>
              <p className="text-xs text-white/30">Оценка потенциала, резюме и следующий шаг для каждой компании</p>
            </div>
          </label>
          <button
            onClick={onRun}
            disabled={scoutLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
          >
            {scoutLoading
              ? <><Icon name="Loader2" size={15} className="animate-spin" />Работаю...</>
              : <><Icon name="Play" size={15} />Запустить разведку</>}
          </button>
        </div>
      </div>

      {/* Прогресс */}
      {scoutLoading && (
        <div className="glass border border-violet-500/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Icon name="Loader2" size={20} className="text-violet-400 animate-spin" />
            <span className="text-white font-semibold">Авто-разведка в процессе...</span>
          </div>
          <div className="space-y-3">
            {SCOUT_STEPS.map((step, i) => {
              const isDone = currentStepIdx > i;
              const isActive = currentStepIdx === i;
              return (
                <div key={step.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-violet-500/15 border border-violet-500/30" : isDone ? "bg-emerald-500/10" : "bg-white/3"}`}>
                  {isDone
                    ? <Icon name="CheckCircle" size={16} className="text-emerald-400 flex-shrink-0" />
                    : isActive
                      ? <Icon name="Loader2" size={16} className="text-violet-400 animate-spin flex-shrink-0" />
                      : <Icon name={step.icon} size={16} className="text-white/20 flex-shrink-0" />}
                  <span className={`text-sm ${isActive ? "text-white font-medium" : isDone ? "text-emerald-400" : "text-white/30"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/30 mt-4 text-center">Обычно занимает 30–60 секунд</p>
        </div>
      )}

      {/* Ошибка */}
      {scoutError && (
        <div className="glass border border-red-500/30 rounded-2xl p-5 flex items-center gap-3 text-red-400">
          <Icon name="AlertCircle" size={18} />
          <span className="text-sm">{scoutError}</span>
        </div>
      )}

      {/* Результат */}
      {scoutResult && !scoutLoading && (
        <div className="space-y-5">
          {/* Итоговая статистика */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Найдено", val: scoutResult.total_found, color: "text-white", bg: "bg-white/5 border-white/10" },
              { label: "Добавлено в CRM", val: scoutResult.inserted, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Дублей пропущено", val: scoutResult.skipped, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
              { label: "Ошибок", val: scoutResult.errors, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            ].map((item, i) => (
              <div key={i} className={`border rounded-2xl p-4 text-center ${item.bg}`}>
                <div className={`text-3xl font-bold font-oswald ${item.color}`}>{item.val}</div>
                <div className="text-xs text-white/40 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Сводка от AI */}
          {scoutResult.radar_summary && (
            <div className="glass border border-violet-500/20 rounded-2xl p-5 flex items-start gap-3">
              <Icon name="Sparkles" size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-white/40 mb-1">{scoutRegion} · {scoutIndustry}</div>
                <p className="text-sm text-white/80">{scoutResult.radar_summary}</p>
              </div>
            </div>
          )}

          {/* Тренды */}
          {(scoutResult.hot_industries?.length > 0 || scoutResult.regional_trends?.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {scoutResult.hot_industries?.length > 0 && (
                <div className="glass border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                    <Icon name="Flame" size={12} className="text-orange-400" />Горячие отрасли
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scoutResult.hot_industries.map((ind, i) => (
                      <span key={i} className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded text-xs">{ind}</span>
                    ))}
                  </div>
                </div>
              )}
              {scoutResult.regional_trends?.length > 0 && (
                <div className="glass border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                    <Icon name="TrendingUp" size={12} className="text-cyan-400" />Тренды региона
                  </div>
                  <ul className="space-y-1">
                    {scoutResult.regional_trends.map((t, i) => (
                      <li key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                        <span className="text-cyan-400 mt-0.5 flex-shrink-0">→</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Таблица компаний */}
          <div className="glass border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Icon name="Building2" size={15} className="text-violet-400" />
                Найденные компании
              </span>
              <span className="text-xs text-white/30">{scoutResult.signals.length} компаний</span>
            </div>
            <div className="divide-y divide-white/5">
              {scoutResult.signals.map((sig: RadarSignal, i: number) => {
                const isOpen = expandedSignal === i;
                const potConf = POTENTIAL_CONFIG[sig.potential] || POTENTIAL_CONFIG["low"];
                const isNew = i < scoutResult.inserted;
                return (
                  <div key={i}>
                    <button
                      onClick={() => setExpandedSignal(isOpen ? null : i)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/3 transition-colors"
                    >
                      <span className="text-xs text-white/20 flex-shrink-0 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white truncate">{sig.company_name}</span>
                          {isNew && (
                            <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex-shrink-0">новый</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-white/30">{sig.industry}</span>
                          {sig.region && <span className="text-xs text-white/20">· {sig.region}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {sig.ai_score != null && (
                          <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                            {sig.ai_score}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${potConf.color} hidden sm:block`}>{potConf.label}</span>
                        <div className="flex flex-wrap gap-1 hidden lg:flex">
                          {sig.tech_tags.slice(0, 2).map(tag => (
                            <span key={tag} className={`px-1.5 py-0.5 rounded text-xs border ${TECH_TAG_COLORS[tag] || "bg-white/5 text-white/40 border-white/10"}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={14} className="text-white/30" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-2 bg-white/3 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-white/30 mb-1.5">Технологии</div>
                              <div className="flex flex-wrap gap-1.5">
                                {sig.tech_tags.map(tag => (
                                  <span key={tag} className={`px-2 py-0.5 rounded text-xs border ${TECH_TAG_COLORS[tag] || "bg-white/5 text-white/40 border-white/10"}`}>{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-white/30 mb-1">Что внедряют</div>
                              <p className="text-xs text-white/60 leading-relaxed">{sig.signal}</p>
                            </div>
                            {sig.source && (
                              <div className="text-xs text-white/25">Источник: {sig.source}</div>
                            )}
                            {sig.website && (
                              <a href={sig.website.startsWith("http") ? sig.website : `https://${sig.website}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
                                <Icon name="Globe" size={11} />{sig.website}
                              </a>
                            )}
                          </div>
                          {sig.ai_summary && (
                            <div className="space-y-3">
                              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                                <div className="text-xs text-violet-400 font-semibold mb-1 flex items-center gap-1.5">
                                  <Icon name="BrainCircuit" size={11} />AI-оценка: {sig.ai_score}/100
                                </div>
                                <p className="text-xs text-white/70">{sig.ai_summary}</p>
                              </div>
                              {sig.ai_reasons && sig.ai_reasons.length > 0 && (
                                <div className="space-y-1">
                                  {sig.ai_reasons.map((r, ri) => (
                                    <div key={ri} className="flex items-start gap-1.5 text-xs text-white/50">
                                      <Icon name="Check" size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                      {r}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {sig.next_action && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                  <div className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                                    <Icon name="ArrowRight" size={11} />Следующий шаг
                                  </div>
                                  <p className="text-xs text-white/70">{sig.next_action}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Пустой стейт разведки */}
      {!scoutLoading && !scoutResult && !scoutError && (
        <div className="glass border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="Radar" size={32} className="text-violet-400" />
          </div>
          <h3 className="font-oswald text-lg font-bold text-white mb-2">Авто-разведка</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto mb-6">
            Выберите регион и отрасль. AI найдёт 30–40 компаний, оценит каждую
            и автоматически добавит в CRM с дедубликацией
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-white/30 mb-6">
            {[
              { icon: "Radar", text: "Радар находит компании" },
              { icon: "BrainCircuit", text: "AI оценивает потенциал" },
              { icon: "ShieldCheck", text: "Дедубликация по ИНН" },
              { icon: "DatabaseZap", text: "Пакетный импорт в CRM" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Icon name={item.icon} size={13} className="text-violet-400" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
