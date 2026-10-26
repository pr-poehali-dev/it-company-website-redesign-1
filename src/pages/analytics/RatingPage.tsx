import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import MarketPicker from "@/components/biz/MarketPicker";
import BizOrderModal from "@/components/biz/BizOrderModal";
import { Card, SourceNote } from "@/components/biz/BizUi";
import { MSP_LABEL, PRICES, TopCompany, bizGet, money, prettyName } from "@/components/biz/bizApi";

export default function RatingPage() {
  const [sp, setSp] = useSearchParams();
  const okved = sp.get("okved") || "ALL";
  const region = sp.get("region") || "RU";
  const sort = sp.get("sort") || "revenue";
  const [items, setItems] = useState<TopCompany[]>([]);
  const [full, setFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(false);

  useEffect(() => {
    setLoading(true);
    bizGet<{ items: TopCompany[]; full_access: boolean }>({ action: "rating", okved: okved === "ALL" ? "" : okved, region, sort })
      .then(r => { setItems(r.items || []); setFull(!!r.full_access); })
      .finally(() => setLoading(false));
  }, [okved, region, sort]);

  const update = (k: string, v: string) => { const n = new URLSearchParams(sp); n.set(k, v); setSp(n, { replace: true }); };

  return (
    <BizShell title="Рейтинг крупнейших компаний России по выручке 2025 | МАТ-Лабс"
      description="Рейтинги компаний по выручке, прибыли и численности за 2025 год — по любой отрасли и региону. Открытые данные ФНС."
      path="/analytics/rating" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Рейтинги" }]}>
      <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold mb-3">Рейтинги компаний</h1>
      <p className="text-white/60 mb-6">Топ по выручке, прибыли или численности за 2025 год. Первые 10 — бесплатно, топ-100 с ИНН — в полном отчёте.</p>
      <MarketPicker okved={okved} region={region} onChange={(o, r) => { const n = new URLSearchParams(sp); n.set("okved", o); n.set("region", r); setSp(n, { replace: true }); }} />
      <div className="flex gap-1.5 mb-4">
        {[["revenue", "По выручке"], ["profit", "По прибыли"], ["staff", "По численности"]].map(([k, l]) => (
          <button key={k} onClick={() => update("sort", k)} className={`px-3.5 py-2 rounded-xl text-sm ${sort === k ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:text-white"}`}>{l}</button>
        ))}
      </div>
      <Card>
        {loading ? <div className="h-96 rounded-xl bg-white/5 animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-white/40 text-xs border-b border-white/10">
                  <th className="py-2 pr-2 font-normal w-10">#</th><th className="py-2 pr-3 font-normal">Компания</th><th className="py-2 pr-3 font-normal">Регион</th>
                  <th className="py-2 pr-3 font-normal text-right">Выручка</th><th className="py-2 pr-3 font-normal text-right">Доходы − расходы</th>
                  <th className="py-2 pr-3 font-normal text-right">Штат</th><th className="py-2 font-normal">Размер</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.rank} className="border-b border-white/5">
                    <td className="py-2.5 pr-2 text-white/40">{c.rank}</td>
                    <td className="py-2.5 pr-3">
                      {c.locked ? (
                        <button onClick={() => setOrder(true)} className="flex items-center gap-2 text-white/40 hover:text-violet-300"><Icon name="Lock" size={13} /><span className="blur-[4px] select-none">АО «Компания из рейтинга»</span></button>
                      ) : <Link to={`/analytics/company/${c.inn}`} className="text-white hover:text-violet-300">{prettyName(c.name)}</Link>}
                    </td>
                    <td className="py-2.5 pr-3 text-white/55 text-xs">{c.region_name}</td>
                    <td className="py-2.5 pr-3 text-right text-white whitespace-nowrap">{money(c.revenue)}</td>
                    <td className={`py-2.5 pr-3 text-right whitespace-nowrap ${c.expenses != null && c.revenue - c.expenses < 0 ? "text-rose-300" : "text-emerald-300/90"}`}>{c.expenses != null ? money(c.revenue - c.expenses) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right text-white/70">{c.staff ?? "—"}</td>
                    <td className="py-2.5 text-white/50 text-xs">{MSP_LABEL[c.msp_cat]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!full && !loading && (
          <button onClick={() => setOrder(true)} className="mt-4 w-full py-3 rounded-xl border border-dashed border-violet-500/40 text-sm text-violet-200 hover:bg-violet-500/10 flex items-center justify-center gap-2">
            <Icon name="FileSpreadsheet" size={15} />Топ-100 с ИНН и Excel — в отчёте о рынке за {PRICES.market.toLocaleString("ru-RU")} ₽
          </button>
        )}
      </Card>
      <div className="mt-5"><SourceNote /></div>
      {order && <BizOrderModal reportType="market" reportKey={`rating:${okved}:${region}:${sort}`} title={`Рейтинг компаний: ОКВЭД ${okved === "ALL" ? "все" : okved}, ${region === "RU" ? "Россия" : region}`} price={PRICES.market} onClose={() => setOrder(false)} />}
    </BizShell>
  );
}
