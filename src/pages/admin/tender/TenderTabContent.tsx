import Icon from "@/components/ui/icon";
import TenderFiltersPanel from "./TenderFiltersPanel";
import TenderResultsArea from "./TenderResultsArea";
import { MARKET_SOURCES, CORP_LIST, Tab, Tender, Analysis, MetaItem, LinkItem, CorpStatus } from "./types";

interface FilterStats {
  total_before: number;
  total_after: number;
  filtered_out: number;
}

interface CommonProps {
  // filters + search (shared)
  query: string;
  loading: boolean;
  searchError: string;
  minPrice: string;
  minDaysLeft: string;
  preferCommercial: boolean;
  preferAdvance: boolean;
  filtersOpen: boolean;
  onQueryChange: (v: string) => void;
  onSearch: (q?: string) => void;
  onMinPriceChange: (v: string) => void;
  onMinDaysLeftChange: (v: string) => void;
  onPreferCommercialChange: (v: boolean) => void;
  onPreferAdvanceChange: (v: boolean) => void;
  onFiltersOpenChange: (v: boolean) => void;
  onResetFilters: () => void;
  // results
  tenders: Tender[];
  filtered: Tender[];
  uniqueSources: string[];
  meta: MetaItem[];
  links: LinkItem[];
  warnings: string[];
  filterStats: FilterStats | null;
  filterSource: string;
  sortBy: "price" | "date";
  selected: Tender | null;
  analysis: Analysis | null;
  analyzing: boolean;
  analyzeError: string;
  savingId: string | null;
  onFilterSourceChange: (src: string) => void;
  onSortByChange: (s: "price" | "date") => void;
  onSelect: (t: Tender) => void;
  onAnalyze: (t: Tender) => void;
  onSave: (t: Tender, a?: Analysis | null) => void;
  onUnsave: (external_id: string, source: string) => void;
  onClosePanel: () => void;
}

// ── TAB: Биржи и ЕИС ──────────────────────────────────────────────────────

interface TenderTabSearchProps extends CommonProps {
  activeSources: string[];
  onActiveSourcesChange: (v: string[]) => void;
}

export function TenderTabSearch({
  activeSources, onActiveSourcesChange,
  query, loading, searchError,
  minPrice, minDaysLeft, preferCommercial, preferAdvance, filtersOpen,
  onQueryChange, onSearch, onMinPriceChange, onMinDaysLeftChange,
  onPreferCommercialChange, onPreferAdvanceChange, onFiltersOpenChange, onResetFilters,
  tenders, filtered, uniqueSources, meta, links, warnings, filterStats,
  filterSource, sortBy, selected, analysis, analyzing, analyzeError, savingId,
  onFilterSourceChange, onSortByChange, onSelect, onAnalyze, onSave, onUnsave, onClosePanel,
}: TenderTabSearchProps) {
  return (
    <>
      {/* Sources picker */}
      <div className="glass neon-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 uppercase tracking-wider">Источники поиска</span>
          <button
            onClick={() => onActiveSourcesChange(activeSources.length === MARKET_SOURCES.length ? [] : MARKET_SOURCES.map(s => s.key))}
            className="text-xs text-violet-400 hover:underline"
          >
            {activeSources.length === MARKET_SOURCES.length ? "Снять все" : "Выбрать все"}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MARKET_SOURCES.map(s => {
            const on = activeSources.includes(s.key);
            return (
              <button key={s.key}
                onClick={() => onActiveSourcesChange(on ? activeSources.filter(k => k !== s.key) : [...activeSources, s.key])}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${on ? "border-violet-500/50 bg-violet-500/10" : "glass border-white/10 opacity-40 hover:opacity-70"}`}>
                <Icon name={s.icon as "Search"} size={16} className={on ? s.color : "text-white/40"} />
                <span className={`font-medium text-center leading-tight ${on ? "text-white" : "text-white/50"}`}>{s.label}</span>
                <span className={on ? "text-white/40" : "text-white/20"}>{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <TenderFiltersPanel
        query={query} loading={loading}
        onQueryChange={onQueryChange} onSearch={onSearch}
        minPrice={minPrice} minDaysLeft={minDaysLeft}
        preferCommercial={preferCommercial} preferAdvance={preferAdvance}
        filtersOpen={filtersOpen}
        onMinPriceChange={onMinPriceChange} onMinDaysLeftChange={onMinDaysLeftChange}
        onPreferCommercialChange={onPreferCommercialChange}
        onPreferAdvanceChange={onPreferAdvanceChange}
        onFiltersOpenChange={onFiltersOpenChange} onResetFilters={onResetFilters}
      />

      {searchError && (
        <div className="glass border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{searchError}</p>
        </div>
      )}

      <TenderResultsArea
        tenders={tenders} filtered={filtered} uniqueSources={uniqueSources}
        meta={meta} links={links} warnings={warnings} filterStats={filterStats}
        filterSource={filterSource} sortBy={sortBy}
        selected={selected} analysis={analysis} analyzing={analyzing}
        analyzeError={analyzeError} savingId={savingId}
        onFilterSourceChange={onFilterSourceChange} onSortByChange={onSortByChange}
        onSelect={onSelect} onAnalyze={onAnalyze} onSave={onSave}
        onUnsave={onUnsave} onClosePanel={onClosePanel}
      />

      {!loading && !tenders.length && !searchError && (
        <div className="text-center py-14">
          <Icon name="Search" size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Выберите источники, введите запрос и нажмите «Поиск»</p>
        </div>
      )}
    </>
  );
}

// ── TAB: Корпорации ────────────────────────────────────────────────────────

interface TenderTabCorporateProps extends CommonProps {
  activeCorps: string[];
  corpStatus: CorpStatus[];
  onActiveCorpsChange: (v: string[]) => void;
}

export function TenderTabCorporate({
  activeCorps, corpStatus, onActiveCorpsChange,
  query, loading, searchError,
  minPrice, minDaysLeft, preferCommercial, preferAdvance, filtersOpen,
  onQueryChange, onSearch, onMinPriceChange, onMinDaysLeftChange,
  onPreferCommercialChange, onPreferAdvanceChange, onFiltersOpenChange, onResetFilters,
  tenders, filtered, uniqueSources, meta, links, warnings, filterStats,
  filterSource, sortBy, selected, analysis, analyzing, analyzeError, savingId,
  onFilterSourceChange, onSortByChange, onSelect, onAnalyze, onSave, onUnsave, onClosePanel,
}: TenderTabCorporateProps) {
  return (
    <>
      {/* Corps picker */}
      <div className="glass neon-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 uppercase tracking-wider">Выберите компании</span>
          <button
            onClick={() => onActiveCorpsChange(activeCorps.length === CORP_LIST.length ? [] : CORP_LIST.map(c => c.key))}
            className="text-xs text-violet-400 hover:underline"
          >
            {activeCorps.length === CORP_LIST.length ? "Снять все" : "Выбрать все"}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CORP_LIST.map(c => {
            const on = activeCorps.includes(c.key);
            const st = corpStatus.find(s => s.key === c.key);
            return (
              <button key={c.key}
                onClick={() => onActiveCorpsChange(on ? activeCorps.filter(k => k !== c.key) : [...activeCorps, c.key])}
                className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all text-left ${on ? "border-violet-500/50 bg-violet-500/10" : "glass border-white/10 opacity-50 hover:opacity-80"}`}>
                <span className="text-xl flex-shrink-0">{c.icon}</span>
                <div className="min-w-0">
                  <div className={`font-medium truncate ${on ? "text-white" : "text-white/60"}`}>{c.name}</div>
                  {st && (
                    <div className={`text-xs mt-0.5 ${st.ok ? (st.count > 0 ? "text-emerald-400" : "text-white/30") : "text-red-400"}`}>
                      {st.ok ? (st.count > 0 ? `${st.count} найдено` : "Ссылка") : st.error || "Недоступен"}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <TenderFiltersPanel
        query={query} loading={loading}
        onQueryChange={onQueryChange} onSearch={onSearch}
        minPrice={minPrice} minDaysLeft={minDaysLeft}
        preferCommercial={preferCommercial} preferAdvance={preferAdvance}
        filtersOpen={filtersOpen}
        onMinPriceChange={onMinPriceChange} onMinDaysLeftChange={onMinDaysLeftChange}
        onPreferCommercialChange={onPreferCommercialChange}
        onPreferAdvanceChange={onPreferAdvanceChange}
        onFiltersOpenChange={onFiltersOpenChange} onResetFilters={onResetFilters}
      />

      {searchError && (
        <div className="glass border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <Icon name="AlertCircle" size={16} className="text-red-400" />
          <p className="text-red-300 text-sm">{searchError}</p>
        </div>
      )}

      <TenderResultsArea
        tenders={tenders} filtered={filtered} uniqueSources={uniqueSources}
        meta={meta} links={links} warnings={warnings} filterStats={filterStats}
        filterSource={filterSource} sortBy={sortBy}
        selected={selected} analysis={analysis} analyzing={analyzing}
        analyzeError={analyzeError} savingId={savingId}
        onFilterSourceChange={onFilterSourceChange} onSortByChange={onSortByChange}
        onSelect={onSelect} onAnalyze={onAnalyze} onSave={onSave}
        onUnsave={onUnsave} onClosePanel={onClosePanel}
      />

      {/* Corp status */}
      {corpStatus.length > 0 && (
        <div className="glass neon-border rounded-2xl p-4">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Статус источников</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {corpStatus.map(s => (
              <div key={s.key} className="glass rounded-xl p-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.ok ? (s.count > 0 ? "bg-emerald-500" : "bg-white/20") : "bg-red-500"}`} />
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium truncate">{s.icon} {s.name}</div>
                  <div className={`text-xs ${s.ok ? (s.count > 0 ? "text-emerald-400" : "text-white/30") : "text-red-400"}`}>
                    {s.ok ? (s.count > 0 ? `${s.count} тендеров` : "Только ссылка") : s.error || "Ошибка"}
                  </div>
                </div>
                {(s.link_only || s.count === 0) && (
                  <a href={s.search_url} target="_blank" rel="noreferrer" className="ml-auto text-white/30 hover:text-white flex-shrink-0">
                    <Icon name="ExternalLink" size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !tenders.length && !searchError && corpStatus.length === 0 && (
        <div className="text-center py-14">
          <Icon name="Building2" size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Выберите компании, введите запрос и нажмите «Поиск»</p>
          <p className="text-white/20 text-xs mt-1">Система проверит страницы закупок каждой компании и API</p>
        </div>
      )}
    </>
  );
}
