import Icon from "@/components/ui/icon";
import { TechSignal, TECH_TAG_COLORS, POTENTIAL_CONFIG } from "./TechRadarTypes";

interface Props {
  signal: TechSignal;
  isSaved: boolean;
  isSaving: boolean;
  onAddToCrm: () => void;
}

export default function TechRadarSignalCard({ signal, isSaved, isSaving, onAddToCrm }: Props) {
  const potConf = POTENTIAL_CONFIG[signal.potential] || POTENTIAL_CONFIG.medium;

  return (
    <div className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Название + потенциал */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-white text-sm">{signal.company_name}</h3>
            <span className={`flex items-center gap-1 text-xs font-medium ${potConf.color}`}>
              <Icon name={potConf.icon} size={12} />
              {potConf.label}
            </span>
            {signal.inn && (
              <span className="text-xs text-white/30">ИНН {signal.inn}</span>
            )}
          </div>

          {/* Регион и отрасль */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {signal.region && (
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Icon name="MapPin" size={11} />
                {signal.region}
              </span>
            )}
            {signal.industry && (
              <span className="text-xs text-white/50">{signal.industry}</span>
            )}
            {signal.website && (
              <a
                href={signal.website.startsWith("http") ? signal.website : `https://${signal.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Icon name="Globe" size={11} />
                Сайт
              </a>
            )}
          </div>

          {/* Технологические метки */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {signal.tech_tags.map(tag => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded-full text-xs border font-medium ${
                  TECH_TAG_COLORS[tag] || "bg-white/10 text-white/60 border-white/20"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Сигнал */}
          <p className="text-xs text-white/60 mt-2 leading-relaxed">{signal.signal}</p>

          {/* Источник + кнопка В CRM */}
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            {signal.source && (
              <p className="text-xs text-white/30 flex items-center gap-1">
                <Icon name="Newspaper" size={10} />
                {signal.source}
              </p>
            )}
            <button
              onClick={onAddToCrm}
              disabled={isSaved || isSaving}
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition-all font-medium ${
                isSaved
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
                  : "border-white/20 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5"
              }`}
            >
              {isSaving
                ? <><Icon name="Loader2" size={11} className="animate-spin" />Сохраняю...</>
                : isSaved
                ? <><Icon name="CheckCircle" size={11} />В CRM</>
                : <><Icon name="Plus" size={11} />В CRM</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
