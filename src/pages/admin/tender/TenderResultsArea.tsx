import Icon from "@/components/ui/icon";
import TenderCard from "./TenderCard";
import TenderAnalysisPanel from "./TenderAnalysisPanel";
import { Tender, Analysis, MetaItem, LinkItem, sourceColor } from "./types";

interface FilterStats {
  total_before: number;
  total_after: number;
  filtered_out: number;
}

interface TenderResultsAreaProps {
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

export default function TenderResultsArea({
  tenders, filtered, uniqueSources,
  meta, links, warnings, filterStats,
  filterSource, sortBy,
  selected, analysis, analyzing, analyzeError, savingId,
  onFilterSourceChange, onSortByChange,
  onSelect, onAnalyze, onSave, onUnsave, onClosePanel,
}: TenderResultsAreaProps) {
  if (!tenders.length && !links.length && !warnings.length) return null;

  return (
    <>
      {warnings.length > 0 && (
        <div className="glass border border-amber-500/30 rounded-xl p-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-300">
              <Icon name="AlertTriangle" size={12} className="flex-shrink-0" />{w}
            </div>
          ))}
        </div>
      )}

      {/* Статистика фильтрации */}
      {filterStats && filterStats.filtered_out > 0 && (
        <div className="flex items-center gap-2 text-xs text-white/40 px-1">
          <Icon name="Filter" size={12} className="text-violet-400" />
          <span>
            Найдено <span className="text-white/70 font-medium">{filterStats.total_before}</span>,
            после фильтров показано <span className="text-white font-medium">{filterStats.total_after}</span>
            {" "}— скрыто {filterStats.filtered_out}
          </span>
        </div>
      )}

      {/* Meta badges + links */}
      {(meta.length > 0 || links.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {meta.map(m => (
            <a key={m.source} href={m.search_url} target="_blank" rel="noreferrer"
              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-80 transition-all ${sourceColor(m.source)}`}>
              {m.source}: {m.count} <Icon name="ExternalLink" size={10} />
            </a>
          ))}
          {links.map(l => (
            <a key={l.source} href={l.url} target="_blank" rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg glass border border-white/10 text-white/40 hover:text-white flex items-center gap-1.5 transition-all">
              {l.source} <Icon name="ExternalLink" size={10} />
            </a>
          ))}
        </div>
      )}

      {/* Source filter + sort */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onFilterSourceChange("all")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filterSource === "all" ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/50 hover:text-white"}`}>
              Все ({tenders.length})
            </button>
            {uniqueSources.map(src => (
              <button key={src} onClick={() => onFilterSourceChange(src)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filterSource === src ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/50 hover:text-white"}`}>
                {src} ({tenders.filter(t => t.source === src).length})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">Сортировка:</span>
            {(["price", "date"] as const).map(s => (
              <button key={s} onClick={() => onSortByChange(s)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${sortBy === s ? "bg-violet-600 text-white" : "glass border border-white/10 text-white/50 hover:text-white"}`}>
                {s === "price" ? "По цене" : "По дате"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {filtered.map(t => (
              <TenderCard
                key={`${t.id}::${t.source}`}
                tender={t}
                isSelected={selected?.id === t.id && selected?.source === t.source}
                savingId={savingId}
                onSelect={() => onSelect(t)}
                onAnalyze={onAnalyze}
                onSave={onSave}
                onUnsave={onUnsave}
              />
            ))}
          </div>
          <TenderAnalysisPanel
            selected={selected}
            analysis={analysis}
            analyzing={analyzing}
            analyzeError={analyzeError}
            savingId={savingId}
            onClose={onClosePanel}
            onAnalyze={onAnalyze}
            onSave={onSave}
          />
        </div>
      )}
    </>
  );
}
