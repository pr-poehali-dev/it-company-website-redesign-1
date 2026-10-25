import Icon from "@/components/ui/icon";
import { Facets, Filters, EMPTY_FILTERS, SOURCE_LABEL } from "./radarApi";

interface Props {
  facets: Facets | null;
  value: Filters;
  onChange: (f: Filters) => void;
}

const sel = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 [&>option]:bg-[#12121f]";

export default function RadarFilters({ facets, value, onChange }: Props) {
  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });
  const active = Object.entries(value).filter(([k, v]) => k !== "sort" && v).length;

  return (
    <div className="bg-white/[0.04] backdrop-blur-sm border border-violet-500/25 rounded-2xl p-4 space-y-3">
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={value.q} onChange={set("q")} placeholder="Название, ИНН или вид деятельности"
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select value={value.region} onChange={set("region")} className={sel} aria-label="Регион">
          <option value="">Все регионы</option>
          {facets?.region.map(f => <option key={f.v} value={f.v}>{f.v} ({f.n})</option>)}
        </select>
        <select value={value.industry} onChange={set("industry")} className={sel} aria-label="Отрасль">
          <option value="">Все отрасли</option>
          {facets?.industry.map(f => <option key={f.v} value={f.v}>{f.v} ({f.n})</option>)}
        </select>
        <select value={value.source} onChange={set("source")} className={sel} aria-label="Кто выдал">
          <option value="">Любой источник денег</option>
          {facets?.source.map(f => <option key={f.v} value={f.v}>{SOURCE_LABEL[f.v] || f.v} ({f.n})</option>)}
        </select>
        <select value={value.year} onChange={set("year")} className={sel} aria-label="Год последней поддержки">
          <option value="">Последняя выплата: любой год</option>
          <option value="2026">в 2026 году</option>
          <option value="2025">в 2025 году</option>
          <option value="2024">в 2024 году</option>
        </select>
        <select value={value.min_amount} onChange={set("min_amount")} className={sel} aria-label="Сумма поддержки">
          <option value="">Любая сумма</option>
          <option value="1">от 1 млн ₽</option>
          <option value="5">от 5 млн ₽</option>
          <option value="20">от 20 млн ₽</option>
          <option value="100">от 100 млн ₽</option>
        </select>
        <select value={value.size} onChange={set("size")} className={sel} aria-label="Размер">
          <option value="">Любой размер</option>
          <option value="микро">Микро</option>
          <option value="малое">Малое</option>
          <option value="среднее">Среднее</option>
        </select>
        <select value={value.min_staff} onChange={set("min_staff")} className={sel} aria-label="Сотрудников">
          <option value="">Любой штат</option>
          <option value="10">от 10 человек</option>
          <option value="50">от 50 человек</option>
          <option value="100">от 100 человек</option>
        </select>
        <select value={value.sort} onChange={set("sort")} className={sel} aria-label="Сортировка">
          <option value="fresh">Сначала свежие деньги</option>
          <option value="amount">По сумме поддержки</option>
          <option value="score">По перспективности</option>
          <option value="staff">По численности</option>
        </select>
      </div>
      {active > 0 && (
        <button onClick={() => onChange({ ...EMPTY_FILTERS, sort: value.sort })}
          className="text-xs text-violet-300 hover:text-white flex items-center gap-1">
          <Icon name="X" size={12} />Сбросить фильтры ({active})
        </button>
      )}
    </div>
  );
}
