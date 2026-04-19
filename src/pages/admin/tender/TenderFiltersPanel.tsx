import Icon from "@/components/ui/icon";
import { QUICK_QUERIES } from "./types";

interface TenderFiltersPanelProps {
  // Search bar
  query: string;
  loading: boolean;
  onQueryChange: (v: string) => void;
  onSearch: (q?: string) => void;

  // Filters
  minPrice: string;
  minDaysLeft: string;
  preferCommercial: boolean;
  preferAdvance: boolean;
  filtersOpen: boolean;
  onMinPriceChange: (v: string) => void;
  onMinDaysLeftChange: (v: string) => void;
  onPreferCommercialChange: (v: boolean) => void;
  onPreferAdvanceChange: (v: boolean) => void;
  onFiltersOpenChange: (v: boolean) => void;
  onResetFilters: () => void;
}

export default function TenderFiltersPanel({
  query, loading, onQueryChange, onSearch,
  minPrice, minDaysLeft, preferCommercial, preferAdvance, filtersOpen,
  onMinPriceChange, onMinDaysLeftChange, onPreferCommercialChange,
  onPreferAdvanceChange, onFiltersOpenChange, onResetFilters,
}: TenderFiltersPanelProps) {
  return (
    <>
      {/* Filters panel */}
      <div className="glass neon-border rounded-2xl overflow-hidden">
        <button
          onClick={() => onFiltersOpenChange(!filtersOpen)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-2">
            <Icon name="SlidersHorizontal" size={14} className="text-violet-400" />
            <span className="text-sm font-medium text-white">Фильтры заказов</span>
            <div className="flex items-center gap-1.5 ml-2">
              {Number(minPrice) > 0 && (
                <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">
                  от {Number(minPrice).toLocaleString("ru")} ₽
                </span>
              )}
              {Number(minDaysLeft) > 0 && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                  ≥{minDaysLeft} дн.
                </span>
              )}
              {preferCommercial && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">Коммерческие</span>
              )}
              {preferAdvance && (
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">Аванс</span>
              )}
            </div>
          </div>
          <Icon name={filtersOpen ? "ChevronUp" : "ChevronDown"} size={14} className="text-white/40" />
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-white/5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Минимальная сумма */}
            <div>
              <label className="block text-xs text-white/50 mb-2 flex items-center gap-1.5">
                <Icon name="DollarSign" size={11} className="text-emerald-400" />
                Сумма от (₽)
              </label>
              <div className="flex items-center gap-2 glass border border-white/10 focus-within:border-violet-500/50 rounded-xl px-3 py-2 transition-all">
                <input
                  type="number" value={minPrice} min={0} step={10000}
                  onChange={e => onMinPriceChange(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm outline-none w-full"
                  placeholder="100000"
                />
                {Number(minPrice) > 0 && (
                  <button onClick={() => onMinPriceChange("0")} className="text-white/30 hover:text-white flex-shrink-0">
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
              <div className="flex gap-1 mt-1.5">
                {["100000", "500000", "1000000"].map(v => (
                  <button key={v} onClick={() => onMinPriceChange(v)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-all ${minPrice === v ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/40 hover:text-white"}`}>
                    {Number(v) >= 1000000 ? `${Number(v) / 1000000}М` : `${Number(v) / 1000}К`}
                  </button>
                ))}
              </div>
            </div>

            {/* Минимальный срок */}
            <div>
              <label className="block text-xs text-white/50 mb-2 flex items-center gap-1.5">
                <Icon name="Calendar" size={11} className="text-blue-400" />
                Срок подачи — не менее дней
              </label>
              <div className="flex items-center gap-2 glass border border-white/10 focus-within:border-violet-500/50 rounded-xl px-3 py-2 transition-all">
                <input
                  type="number" value={minDaysLeft} min={0} max={365}
                  onChange={e => onMinDaysLeftChange(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                  placeholder="3"
                />
                {Number(minDaysLeft) > 0 && (
                  <button onClick={() => onMinDaysLeftChange("0")} className="text-white/30 hover:text-white flex-shrink-0">
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
              <div className="flex gap-1 mt-1.5">
                {["3", "7", "14", "30"].map(v => (
                  <button key={v} onClick={() => onMinDaysLeftChange(v)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-all ${minDaysLeft === v ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/40 hover:text-white"}`}>
                    {v}д
                  </button>
                ))}
              </div>
            </div>

            {/* Предпочтения */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs text-white/50 mb-2 flex items-center gap-1.5">
                <Icon name="Star" size={11} className="text-amber-400" />
                Предпочтения (поднимают в топ)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onPreferCommercialChange(!preferCommercial)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${preferCommercial ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "glass border-white/10 text-white/40 hover:text-white"}`}
                >
                  <Icon name={preferCommercial ? "CheckCircle" : "Circle"} size={14} />
                  Коммерческие заказы
                </button>
                <button
                  onClick={() => onPreferAdvanceChange(!preferAdvance)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${preferAdvance ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "glass border-white/10 text-white/40 hover:text-white"}`}
                >
                  <Icon name={preferAdvance ? "CheckCircle" : "Circle"} size={14} />
                  С авансом / предоплатой
                </button>
                <button
                  onClick={onResetFilters}
                  className="text-xs px-3 py-2 glass border border-white/10 text-white/30 hover:text-violet-400 hover:border-violet-500/40 rounded-xl transition-all"
                >
                  Сбросить к рекомендованным
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 glass neon-border focus-within:border-violet-500/50 rounded-xl px-4 py-3 transition-all">
          <Icon name="Search" size={18} className="text-white/30 flex-shrink-0" />
          <input
            type="text" value={query} onChange={e => onQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearch()}
            placeholder="Ключевые слова: разработка ИИ, кибербезопасность, ERP-система..."
            className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
          />
          {query && <button onClick={() => onQueryChange("")} className="text-white/30 hover:text-white"><Icon name="X" size={14} /></button>}
        </div>
        <button
          onClick={() => onSearch()} disabled={loading || !query.trim()}
          className="btn-gradient px-6 rounded-xl font-semibold text-sm text-white flex items-center gap-2 disabled:opacity-50 min-w-[110px] justify-center"
        >
          {loading ? <><Icon name="Loader2" size={15} className="animate-spin" />Поиск...</> : <><Icon name="Search" size={15} />Поиск</>}
        </button>
      </div>

      {/* Quick queries */}
      <div className="flex flex-wrap gap-2">
        {QUICK_QUERIES.map(q => (
          <button key={q} onClick={() => { onQueryChange(q); onSearch(q); }}
            className="text-xs px-3 py-1.5 glass border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 text-white/50 hover:text-white rounded-lg transition-all">
            {q}
          </button>
        ))}
      </div>
    </>
  );
}
