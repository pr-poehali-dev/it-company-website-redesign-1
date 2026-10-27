import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { RadarItem, fmtMoney, fmtDate, prettyName, SOURCE_LABEL } from "./radarApi";

interface Props {
  items: RadarItem[];
  loading: boolean;
}

function isFresh(d: string | null) {
  if (!d) return false;
  return Date.now() - new Date(d).getTime() < 120 * 24 * 3600 * 1000;
}

export default function RadarList({ items, loading }: Props) {
  if (loading && !items.length) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-10 text-center text-white/50">
        <Icon name="SearchX" size={28} className="mx-auto mb-3 text-white/30" />
        По этим фильтрам компаний нет. Попробуйте ослабить условия.
      </div>
    );
  }
  return (
    <div className={`space-y-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
      {items.map(c => (
        <Link key={c.inn} to={`/radar/${c.inn}`}
          className="block bg-white/[0.04] backdrop-blur-sm border border-white/10 hover:border-violet-500/50 rounded-2xl p-4 md:p-5 transition-colors group">
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-white group-hover:text-violet-200 transition-colors">{prettyName(c.name)}</h3>
                {isFresh(c.last_date) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">свежие деньги</span>
                )}
                {c.has_contacts && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">есть контакты</span>
                )}
              </div>
              <div className="text-sm text-white/55 line-clamp-1">{c.activity || c.industry || "Вид деятельности не указан"}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/45">
                <span className="flex items-center gap-1"><Icon name="MapPin" size={12} />{c.region || "—"}</span>
                {c.industry && <span className="flex items-center gap-1"><Icon name="Factory" size={12} />{c.industry}</span>}
                {c.employees ? <span className="flex items-center gap-1"><Icon name="Users" size={12} />{c.employees} чел.</span> : null}
                <span className="flex items-center gap-1"><Icon name="Landmark" size={12} />{SOURCE_LABEL[c.source] || c.source}</span>
              </div>
            </div>
            <div className="flex md:flex-col md:items-end gap-4 md:gap-1 shrink-0">
              <div>
                <div className="font-['Oswald',sans-serif] text-2xl font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent leading-none">{fmtMoney(c.total_amount)}</div>
                <div className="text-[11px] text-white/40 md:text-right mt-1">поддержка 2024–2026</div>
              </div>
              <div className="text-xs text-white/50 md:text-right">
                последняя: {fmtDate(c.last_date)}
                {c.last_amount ? <span className="text-white/70"> · {fmtMoney(c.last_amount)}</span> : null}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
