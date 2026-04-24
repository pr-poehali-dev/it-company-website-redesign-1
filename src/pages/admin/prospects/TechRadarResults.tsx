import { useState } from "react";
import Icon from "@/components/ui/icon";
import { RadarResult, TechSignal, TECH_TAG_COLORS, POTENTIAL_CONFIG } from "./TechRadarTypes";

interface Props {
  result: RadarResult;
  allTags: string[];
  filtered: TechSignal[];
  filterTag: string;
  filterPotential: string;
  savedIds: Set<string>;
  savingAll: boolean;
  saveAllCount: number | null;
  onFilterTag: (tag: string) => void;
  onFilterPotential: (p: string) => void;
  onAddToCrm: (signal: TechSignal, key: string) => void;
  onSaveAll: () => void;
}

export default function TechRadarResults({
  result,
  allTags,
  filtered,
  filterTag,
  filterPotential,
  savedIds,
  savingAll,
  saveAllCount,
  onFilterTag,
  onFilterPotential,
  onAddToCrm,
  onSaveAll,
}: Props) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Сводка */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Icon name="Sparkles" size={18} className="text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white mb-1">
              {result.region} — {result.industry_filter}
            </p>
            <p className="text-sm text-white/70">{result.summary}</p>
          </div>
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{result.tech_signals.length}</div>
          <div className="text-xs text-white/50 mt-0.5">компаний найдено</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {result.tech_signals.filter(s => s.potential === "high").length}
          </div>
          <div className="text-xs text-white/50 mt-0.5">высокий потенциал</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{allTags.length}</div>
          <div className="text-xs text-white/50 mt-0.5">типов технологий</div>
        </div>
      </div>

      {/* Действия + фильтры */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onSaveAll}
          disabled={savingAll || savedIds.size >= result.tech_signals.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
        >
          {savingAll
            ? <><Icon name="Loader2" size={14} className="animate-spin" />Сохраняю...</>
            : <><Icon name="DatabaseZap" size={14} />Сохранить все в CRM</>}
        </button>
        {saveAllCount !== null && (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Icon name="CheckCircle" size={13} />
            Добавлено {saveAllCount} компаний
          </span>
        )}
      </div>

      {/* Тренды и горячие отрасли */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {result.hot_industries?.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/50 mb-2 flex items-center gap-1.5">
              <Icon name="Flame" size={12} className="text-orange-400" />
              Горячие отрасли
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.hot_industries.map(ind => (
                <span key={ind} className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded text-xs">
                  {ind}
                </span>
              ))}
            </div>
          </div>
        )}
        {result.regional_trends?.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/50 mb-2 flex items-center gap-1.5">
              <Icon name="TrendingUp" size={12} className="text-cyan-400" />
              Региональные тренды
            </p>
            <ul className="space-y-1">
              {result.regional_trends.map((t, i) => (
                <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                  <span className="text-cyan-400 mt-0.5">→</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Фильтры */}
      {result.tech_signals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/40">Фильтр:</span>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => onFilterTag(tag)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                filterTag === tag
                  ? (TECH_TAG_COLORS[tag] || "bg-white/20 text-white border-white/30")
                  : "border-white/10 text-white/40 hover:text-white/60"
              }`}
            >
              {tag}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10" />
          {["high", "medium", "low"].map(p => (
            <button
              key={p}
              onClick={() => onFilterPotential(p)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                filterPotential === p
                  ? "bg-white/20 border-white/30 text-white"
                  : "border-white/10 text-white/40 hover:text-white/60"
              }`}
            >
              {POTENTIAL_CONFIG[p]?.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-white/30">{filtered.length} компаний</span>
        </div>
      )}

      {/* Таблица */}
      <div className="glass border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3 w-6">#</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Компания</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3 hidden md:table-cell">Отрасль</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3 hidden lg:table-cell">Технологии</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Потенциал</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signal, i) => {
                const crmKey = signal.company_name + signal.inn;
                const isSaved = savedIds.has(crmKey);
                const isSaving = savedIds.has(crmKey + "_loading");
                const isExpanded = expandedRow === i;
                const potConf = POTENTIAL_CONFIG[signal.potential] || POTENTIAL_CONFIG["low"];

                return (
                  <>
                    <tr
                      key={i}
                      onClick={() => setExpandedRow(isExpanded ? null : i)}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${isExpanded ? "bg-white/5" : "hover:bg-white/3"}`}
                    >
                      <td className="px-4 py-3 text-xs text-white/30">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white text-sm">{signal.company_name}</div>
                        {signal.region && (
                          <div className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                            <Icon name="MapPin" size={10} />
                            {signal.region}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-white/60">{signal.industry || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {signal.tech_tags.slice(0, 3).map(tag => (
                            <span key={tag} className={`px-1.5 py-0.5 rounded text-xs border ${TECH_TAG_COLORS[tag] || "bg-white/10 text-white/50 border-white/10"}`}>
                              {tag}
                            </span>
                          ))}
                          {signal.tech_tags.length > 3 && (
                            <span className="text-xs text-white/30">+{signal.tech_tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${potConf.color}`}>
                          {potConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Icon
                          name={isExpanded ? "ChevronUp" : "ChevronDown"}
                          size={14}
                          className="text-white/30"
                        />
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${i}-detail`} className="border-b border-white/5 bg-white/3">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              {/* Технологии (полный список) */}
                              <div className="mb-3">
                                <div className="text-xs text-white/40 mb-1.5">Технологии</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {signal.tech_tags.map(tag => (
                                    <span key={tag} className={`px-2 py-0.5 rounded text-xs border ${TECH_TAG_COLORS[tag] || "bg-white/10 text-white/50 border-white/10"}`}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {/* Сигнал */}
                              <div>
                                <div className="text-xs text-white/40 mb-1">Что внедряют</div>
                                <p className="text-xs text-white/70 leading-relaxed">{signal.signal}</p>
                              </div>
                              {signal.source && (
                                <div className="mt-2">
                                  <div className="text-xs text-white/30">Источник: {signal.source}</div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {signal.website && (
                                <a
                                  href={signal.website.startsWith("http") ? signal.website : `https://${signal.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                  <Icon name="Globe" size={12} />
                                  {signal.website}
                                </a>
                              )}
                              {signal.inn && (
                                <div className="text-xs text-white/40">ИНН: {signal.inn}</div>
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); onAddToCrm(signal, crmKey); }}
                                disabled={isSaved || isSaving}
                                className={`mt-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all w-fit ${
                                  isSaved
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                                    : "bg-violet-600 hover:bg-violet-500 text-white"
                                }`}
                              >
                                {isSaving
                                  ? <><Icon name="Loader2" size={12} className="animate-spin" />Сохраняю...</>
                                  : isSaved
                                    ? <><Icon name="Check" size={12} />Добавлен в CRM</>
                                    : <><Icon name="Plus" size={12} />Добавить в CRM</>}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-10 text-white/30 text-sm">
              Нет компаний по выбранным фильтрам
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
