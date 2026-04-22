import Icon from "@/components/ui/icon";
import { REGIONS, INDUSTRIES } from "./TechRadarTypes";

const QUICK_REGIONS = [
  "Москва", "Санкт-Петербург", "Московская область",
  "Республика Татарстан", "Свердловская область", "Краснодарский край",
  "Республика Башкортостан", "Новосибирская область", "Тюменская область",
  "Нижегородская область", "Челябинская область", "Ростовская область",
  "Самарская область", "Красноярский край", "Пермский край",
];

interface Props {
  region: string;
  industry: string;
  loading: boolean;
  onRegionChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onSubmit: () => void;
}

export default function TechRadarForm({ region, industry, loading, onRegionChange, onIndustryChange, onSubmit }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Регион */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">Регион *</label>
          <div className="relative">
            <input
              list="regions-list"
              value={region}
              onChange={e => onRegionChange(e.target.value)}
              placeholder="Например: Татарстан"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
            <datalist id="regions-list">
              {REGIONS.map(r => <option key={r} value={r} />)}
            </datalist>
          </div>
        </div>

        {/* Отрасль */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">Отрасль</label>
          <select
            value={industry}
            onChange={e => onIndustryChange(e.target.value)}
            className="w-full bg-white border border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-violet-500"
          >
            <option value="">Все отрасли</option>
            {INDUSTRIES.slice(1).map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Быстрые регионы */}
      <div>
        <p className="text-xs text-white/40 mb-2">Регионы с высоким потенциалом:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REGIONS.map(r => (
            <button
              key={r}
              onClick={() => onRegionChange(r)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                region === r
                  ? "bg-violet-500/30 border-violet-500/50 text-violet-300"
                  : "border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={!region.trim() || loading}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/30 disabled:text-white/30 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
      >
        {loading ? (
          <>
            <Icon name="Loader2" size={16} className="animate-spin" />
            ИИ анализирует регион... (~30 сек)
          </>
        ) : (
          <>
            <Icon name="Radar" size={16} />
            Запустить радар
          </>
        )}
      </button>
    </div>
  );
}
