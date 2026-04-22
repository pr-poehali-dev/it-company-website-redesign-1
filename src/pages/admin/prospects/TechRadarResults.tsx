import Icon from "@/components/ui/icon";
import { RadarResult, TechSignal, TECH_TAG_COLORS, POTENTIAL_CONFIG } from "./TechRadarTypes";
import TechRadarSignalCard from "./TechRadarSignalCard";

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

      {/* Метрики + кнопка сохранения в CRM */}
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

      {/* Сохранить все в CRM */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSaveAll}
          disabled={savingAll || savedIds.size >= result.tech_signals.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
        >
          {savingAll
            ? <><Icon name="Loader2" size={14} className="animate-spin" />Сохраняю в CRM...</>
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
        </div>
      )}

      {/* Карточки компаний */}
      <div className="space-y-3">
        {filtered.map((signal, i) => {
          const crmKey = signal.company_name + signal.inn;
          return (
            <TechRadarSignalCard
              key={i}
              signal={signal}
              isSaved={savedIds.has(crmKey)}
              isSaving={savedIds.has(crmKey + "_loading")}
              onAddToCrm={() => onAddToCrm(signal, crmKey)}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            Нет компаний по выбранным фильтрам
          </div>
        )}
      </div>
    </div>
  );
}
