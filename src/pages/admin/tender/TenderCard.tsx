import Icon from "@/components/ui/icon";
import { Tender, sourceColor } from "./types";

interface TenderCardProps {
  tender: Tender;
  isSelected: boolean;
  savingId: string | null;
  onSelect?: () => void;
  onAnalyze: (t: Tender) => void;
  onSave: (t: Tender) => void;
  onUnsave: (external_id: string, source: string) => void;
}

export default function TenderCard({
  tender, isSelected, savingId, onSelect, onAnalyze, onSave, onUnsave,
}: TenderCardProps) {
  const isSaving = savingId === tender.id;

  return (
    <div
      onClick={onSelect}
      className={`glass rounded-2xl p-4 transition-all border ${onSelect ? "cursor-pointer" : ""} ${isSelected ? "border-violet-500/60 bg-violet-500/5" : "border-white/10 hover:border-white/20"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${sourceColor(tender.source)}`}>{tender.source}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full ${tender.status === "Активный" || tender.status.includes("Подача") ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
            {tender.status}
          </span>
          <button
            onClick={e => { e.stopPropagation(); if (tender.saved) { onUnsave(tender.id, tender.source); } else { onSave(tender); } }}
            disabled={isSaving}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${tender.saved ? "bg-amber-500/20 text-amber-400 hover:bg-red-500/20 hover:text-red-400" : "glass border border-white/10 text-white/30 hover:text-amber-400"}`}
          >
            {isSaving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Bookmark" size={12} />}
          </button>
        </div>
      </div>

      <p className="text-white text-sm font-medium leading-snug mb-2 line-clamp-2">{tender.name}</p>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Icon name="DollarSign" size={11} className="text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 text-xs font-semibold">{tender.price_fmt}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="Building2" size={11} className="text-white/30 flex-shrink-0" />
          <span className="text-white/50 text-xs truncate">{tender.customer}</span>
        </div>
        {tender.region && tender.region !== "—" && (
          <div className="flex items-center gap-1.5">
            <Icon name="MapPin" size={11} className="text-white/30 flex-shrink-0" />
            <span className="text-white/40 text-xs truncate">{tender.region}</span>
          </div>
        )}
        {tender.end_date && tender.end_date !== "—" && (
          <div className="flex items-center gap-1.5">
            <Icon name="Calendar" size={11} className="text-white/30 flex-shrink-0" />
            <span className="text-white/40 text-xs">Срок: {tender.end_date}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
        {onSelect && (
          <button
            onClick={e => { e.stopPropagation(); onAnalyze(tender); }}
            className="flex-1 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-medium flex items-center justify-center gap-1 transition-all"
          >
            <Icon name="Sparkles" size={11} /> ИИ-анализ
          </button>
        )}
        <a
          href={tender.url} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="py-1.5 px-3 rounded-lg glass border border-white/10 hover:border-white/20 text-white/40 hover:text-white text-xs flex items-center gap-1 transition-all"
        >
          <Icon name="ExternalLink" size={11} />
        </a>
      </div>
    </div>
  );
}
