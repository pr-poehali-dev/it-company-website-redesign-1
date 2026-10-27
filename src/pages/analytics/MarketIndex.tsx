import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import MarketPicker from "@/components/biz/MarketPicker";
import { Card, SourceNote } from "@/components/biz/BizUi";
import { ItemListSchema } from "@/components/biz/SeoSchema";
import { Overview, bizGet, money, num, pct } from "@/components/biz/bizApi";

type Sort = "revenue" | "companies" | "median" | "profit" | "conc";

export default function MarketIndex() {
  const [d, setD] = useState<Overview | null>(null);
  const [sort, setSort] = useState<Sort>("revenue");
  const navigate = useNavigate();
  useEffect(() => { bizGet<Overview>({ action: "overview" }).then(setD); }, []);

  const rows = useMemo(() => {
    const list = [...(d?.industries || [])];
    const key: Record<Sort, (x: Overview["industries"][number]) => number> = {
      revenue: x => Number(x.revenue), companies: x => x.companies, median: x => Number(x.median_revenue),
      profit: x => pct(x.profitable, x.with_revenue), conc: x => Number(x.top10_share),
    };
    return list.sort((a, b) => key[sort](b) - key[sort](a));
  }, [d, sort]);

  const bySection = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => m.set(r.section, (m.get(r.section) || 0) + 1));
    return m;
  }, [rows]);

  const TH = ({ id, children, right = true }: { id: Sort; children: string; right?: boolean }) => (
    <th className={`py-2 pr-3 font-normal ${right ? "text-right" : ""}`}>
      <button onClick={() => setSort(id)} className={`inline-flex items-center gap-1 ${sort === id ? "text-violet-300" : "hover:text-white"}`}>
        {children}{sort === id && <Icon name="ArrowDown" size={11} />}
      </button>
    </th>
  );

  return (
    <BizShell title="Рынки России по отраслям: объём, число компаний, концентрация 2025 | МАТ-Лабс"
      description="88 отраслей ОКВЭД: выручка 2025 года, число компаний, медианная выручка, доля прибыльных, концентрация топ-10. Отчёт по любой отрасли и региону."
      path="/analytics/market" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Рынки" }]}>
      {rows.length > 0 && <ItemListSchema name="Рынки России по отраслям" items={rows.map(r => ({ name: r.name, url: `https://mat-labs.ru/analytics/market/${r.okved2}` }))} />}
      <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold mb-2">Отчёты о рынках</h1>
      <p className="text-white/60 mb-6 max-w-3xl">Выберите отрасль (до 5-го знака ОКВЭД) и регион — откроется отчёт с объёмом рынка, лидерами, сегментами, географией и рисками. {bySection.size ? `${rows.length} отраслей в ${bySection.size} разделах.` : ""}</p>
      <MarketPicker okved="ALL" region="RU" onChange={(o, r) => navigate(`/analytics/market/${o}${r !== "RU" ? `/${r}` : ""}`)} />

      <Card title="Все отрасли России, 2025" icon="Table">
        {!d ? <div className="h-96 rounded-xl bg-white/5 animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-white/40 text-xs border-b border-white/10">
                  <th className="py-2 pr-3 font-normal w-12">ОКВЭД</th>
                  <th className="py-2 pr-3 font-normal">Отрасль</th>
                  <TH id="revenue">Выручка</TH>
                  <TH id="companies">Компаний</TH>
                  <TH id="median">Медиана</TH>
                  <TH id="profit">Прибыльных</TH>
                  <TH id="conc">Топ-10</TH>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.okved2} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="py-2.5 pr-3 text-cyan-300">{r.okved2}</td>
                    <td className="py-2.5 pr-3">
                      <Link to={`/analytics/market/${r.okved2}`} className="text-white hover:text-violet-300">{r.name}</Link>
                      <div className="text-[11px] text-white/35">{r.section}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-white whitespace-nowrap">{money(r.revenue)}</td>
                    <td className="py-2.5 pr-3 text-right text-white/70">{num(r.companies)}</td>
                    <td className="py-2.5 pr-3 text-right text-white/70 whitespace-nowrap">{money(r.median_revenue)}</td>
                    <td className="py-2.5 pr-3 text-right text-emerald-300/90">{pct(r.profitable, r.with_revenue)}%</td>
                    <td className="py-2.5 pr-3 text-right text-white/70">{Number(r.top10_share).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="mt-5"><SourceNote /></div>
    </BizShell>
  );
}
