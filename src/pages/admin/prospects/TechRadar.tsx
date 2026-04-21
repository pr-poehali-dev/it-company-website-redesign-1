import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PROSPECTS_URL } from "./types";

const TECH_TAG_COLORS: Record<string, string> = {
  "ИИ":                "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "ERP":               "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Автоматизация":     "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Роботизация":       "bg-red-500/20 text-red-300 border-red-500/30",
  "Цифровизация":      "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "IoT":               "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Облака":            "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "RPA":               "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "ML":                "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Промышленный IoT":  "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

const POTENTIAL_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  high:   { label: "Высокий",  color: "text-emerald-400", icon: "TrendingUp" },
  medium: { label: "Средний",  color: "text-amber-400",   icon: "Minus" },
  low:    { label: "Низкий",   color: "text-slate-400",   icon: "TrendingDown" },
};

const REGIONS = [
  "Москва", "Санкт-Петербург", "Татарстан", "Свердловская область",
  "Новосибирская область", "Краснодарский край", "Башкортостан",
  "Самарская область", "Ростовская область", "Нижегородская область",
  "Красноярский край", "Пермский край", "Воронежская область",
  "Тюменская область", "Иркутская область", "Ханты-Мансийский АО",
  "Ленинградская область", "Удмуртская Республика", "Челябинская область",
  "Белгородская область",
];

const INDUSTRIES = [
  "Все отрасли", "Промышленность", "Машиностроение", "Металлургия",
  "Нефть и газ", "Агропром", "Ритейл", "Логистика и транспорт",
  "Строительство", "Медицина и фармацевтика", "Финансы и банки",
  "Энергетика", "Образование", "ИТ и телеком",
];

interface TechSignal {
  company_name: string;
  inn: string;
  region: string;
  industry: string;
  tech_tags: string[];
  signal: string;
  potential: string;
  website: string;
  source: string;
}

interface RadarResult {
  region: string;
  industry_filter: string;
  summary: string;
  tech_signals: TechSignal[];
  hot_industries: string[];
  regional_trends: string[];
  error?: string;
}

interface Props {
  token: string;
}

export default function TechRadar({ token }: Props) {
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RadarResult | null>(null);
  const [filterTag, setFilterTag] = useState<string>("");
  const [filterPotential, setFilterPotential] = useState<string>("");

  async function runRadar() {
    if (!region.trim()) return;
    setLoading(true);
    setResult(null);
    setFilterTag("");
    setFilterPotential("");
    try {
      const res = await fetch(PROSPECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "radar",
          region: region.trim(),
          industry: industry === "Все отрасли" ? "" : industry,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ region, industry_filter: industry, summary: "", tech_signals: [], hot_industries: [], regional_trends: [], error: "Ошибка запроса" });
    } finally {
      setLoading(false);
    }
  }

  const allTags = result
    ? Array.from(new Set(result.tech_signals.flatMap(s => s.tech_tags)))
    : [];

  const filtered = result?.tech_signals.filter(s => {
    if (filterTag && !s.tech_tags.includes(filterTag)) return false;
    if (filterPotential && s.potential !== filterPotential) return false;
    return true;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon name="Radar" size={20} className="text-violet-400" />
          Технологический радар
        </h2>
        <p className="text-sm text-white/50 mt-1">
          ИИ-анализ регионов: выявление компаний, активно внедряющих новые технологии
        </p>
      </div>

      {/* Форма запроса */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Регион */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Регион *</label>
            <div className="relative">
              <input
                list="regions-list"
                value={region}
                onChange={e => setRegion(e.target.value)}
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
              onChange={e => setIndustry(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
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
            {["Татарстан", "Свердловская область", "Новосибирская область", "Краснодарский край", "Башкортостан", "Тюменская область"].map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
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
          onClick={runRadar}
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

      {/* Результаты */}
      {result && !result.error && (
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
              <div className="text-2xl font-bold text-amber-400">
                {allTags.length}
              </div>
              <div className="text-xs text-white/50 mt-0.5">типов технологий</div>
            </div>
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
                  onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                    filterTag === tag
                      ? (TECH_TAG_COLORS[tag] || "bg-white/20 text-white border-white/30")
                      : "border-white/10 text-white/50 hover:text-white/70"
                  }`}
                >
                  {tag}
                </button>
              ))}
              <div className="w-px h-4 bg-white/10" />
              {["high", "medium", "low"].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPotential(filterPotential === p ? "" : p)}
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
              const potConf = POTENTIAL_CONFIG[signal.potential] || POTENTIAL_CONFIG.medium;
              return (
                <div key={i} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all">
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

                      {/* Источник */}
                      {signal.source && (
                        <p className="text-xs text-white/30 mt-1 flex items-center gap-1">
                          <Icon name="Newspaper" size={10} />
                          {signal.source}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">
                Нет компаний по выбранным фильтрам
              </div>
            )}
          </div>
        </div>
      )}

      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300 flex items-center gap-2">
          <Icon name="AlertCircle" size={16} />
          {result.error}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-white/25 text-sm">
          <Icon name="Radar" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Выберите регион и запустите радар</p>
          <p className="text-xs mt-1">ИИ проанализирует открытые источники и найдёт компании,<br/>активно внедряющие технологии</p>
        </div>
      )}
    </div>
  );
}