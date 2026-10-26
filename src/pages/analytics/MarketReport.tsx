import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { BarRow, Card, INSIGHT_ICON, Kpi, Locked, SourceNote } from "@/components/biz/BizUi";
import BizOrderModal from "@/components/biz/BizOrderModal";
import { DatasetSchema } from "@/components/biz/SeoSchema";
import MarketPicker from "@/components/biz/MarketPicker";
import { MSP_LABEL, MarketReport as Report, PRICES, bizGet, money, num, pct, prettyName } from "@/components/biz/bizApi";

const TT = { background: "#10101c", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12 };
const PIE = ["#7c3aed", "#0891b2", "#a78bfa", "#22d3ee", "#475569"];

const INCLUDES = [
  "Топ-50 компаний рынка с ИНН, выручкой, долей, штатом и налоговым режимом",
  "Excel со всеми компаниями сегмента для своей CRM",
  "Сравнение с соседними регионами и Россией в целом",
  "Выводы аналитика: где точки входа и кого предложить в партнёры",
];

export default function MarketReport() {
  const { okved = "ALL", region = "RU" } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(false);

  useEffect(() => {
    setD(null);
    setError("");
    bizGet<Report>({ action: "market", okved, region }).then(r => (r.error ? setError(r.error) : setD(r))).catch(() => setError("Не удалось загрузить"));
    window.scrollTo(0, 0);
  }, [okved, region]);

  const m = d?.metrics;
  const nat = d?.national;
  const title = d ? `${d.okved_name} — ${d.region_name}` : "Отчёт о рынке";
  const mspPie = m ? [
    { name: "Микро", value: m.micro }, { name: "Малые", value: m.small }, { name: "Средние", value: m.medium }, { name: "Крупные и прочие", value: m.non_msp },
  ].filter(x => x.value > 0) : [];
  const maxSeg = Math.max(1, ...(d?.segments || []).map(s => Number(s.revenue)));
  const maxGeo = Math.max(1, ...(d?.geo || []).slice(0, 12).map(s => Number(s.revenue)));
  const unlock = () => setOrder(true);
  const full = d?.full_access;

  return (
    <BizShell title={`${title}: объём рынка, лидеры, доли 2025 | МАТ-Лабс`}
      description={d && m ? `Рынок «${d.okved_name}» (${d.region_name}): ${num(m.companies)} компаний, выручка ${money(m.revenue)} за 2025 год, лидеры и их доли, концентрация, новые игроки.` : "Отчёт о рынке по данным ФНС"}
      path={`/analytics/market/${okved}${region !== "RU" ? `/${region}` : ""}`}
      crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Рынки", href: "/analytics/market" }, { label: d?.okved_name || okved }]}>

      {d && m && <DatasetSchema name={`Рынок «${d.okved_name}» — ${d.region_name}, 2025`} url={`https://mat-labs.ru/analytics/market/${okved}${region !== "RU" ? `/${region}` : ""}`}
        description={`${num(m.companies)} компаний, выручка ${money(m.revenue)}, медиана ${money(m.median_revenue)}, доля топ-10 ${Number(m.top10_share).toFixed(0)}%. Данные ФНС за 2025 год.`} />}
      <MarketPicker okved={okved} region={region} onChange={(o, r) => navigate(`/analytics/market/${o}${r !== "RU" ? `/${r}` : ""}`)} />

      {error && <Card><p className="text-white/60 text-center py-8">{error}. Попробуйте другой код или регион.</p></Card>}
      {!d && !error && <div className="space-y-4"><div className="h-40 rounded-2xl bg-white/5 animate-pulse" /><div className="h-80 rounded-2xl bg-white/5 animate-pulse" /></div>}

      {d && m && (
        <div className="space-y-5">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-sm text-violet-300 mb-1">{d.section || "Отчёт о рынке"} · ОКВЭД {okved === "ALL" ? "все" : okved} · 2025 год</div>
              <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold leading-tight">{d.okved_name}</h1>
              <div className="text-white/60 mt-1 flex items-center gap-1.5"><Icon name="MapPin" size={15} />{d.region_name}</div>
            </div>
            {!full && (
              <button onClick={unlock} className="shrink-0 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-6 py-3.5 rounded-2xl font-semibold text-white flex items-center gap-2 shadow-lg shadow-violet-600/30">
                <Icon name="FileText" size={18} />Полный отчёт · {PRICES.market.toLocaleString("ru-RU")} ₽
              </button>
            )}
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi value={money(m.revenue)} label="объём рынка (выручка 2025)" sub={nat && d.region !== "RU" ? `${pct(Number(m.revenue), Number(nat.revenue))}% от рынка России` : undefined} />
            <Kpi value={num(m.companies)} label="компаний" sub={`с отчётностью о выручке: ${num(m.with_revenue)}`} />
            <Kpi value={money(m.median_revenue)} label="медианная выручка" sub={nat && d.region !== "RU" ? `по России: ${money(nat.median_revenue)}` : "типичная компания"} />
            <Kpi value={num(m.staff)} label="сотрудников" sub={m.companies ? `≈ ${Math.round(Number(m.staff) / m.companies)} на компанию` : undefined} />
            <Kpi value={`${pct(m.profitable, m.with_revenue)}%`} label="с доходами выше расходов" accent="from-emerald-300 to-cyan-300" />
            <Kpi value={`${Number(m.top10_share).toFixed(0)}%`} label="доля топ-10 игроков" sub={m.hhi ? `индекс HHI ${Math.round(Number(m.hhi))}` : undefined} />
            <Kpi value={`${pct(m.new_3y, m.companies)}%`} label="новые игроки 2024–2026" accent="from-amber-200 to-orange-300" />
            <Kpi value={`${pct(m.with_debt, m.companies)}%`} label="с налоговой недоимкой" sub={money(m.debt_sum)} accent="from-rose-300 to-orange-300" />
          </div>

          {d.insights.length > 0 && (
            <Card title="Главное о рынке" icon="Lightbulb">
              <div className="grid md:grid-cols-2 gap-3">
                {d.insights.map(i => (
                  <div key={i.text} className="flex gap-3 text-sm text-white/80 bg-white/[0.02] rounded-xl p-3">
                    <Icon name={INSIGHT_ICON[i.kind] || "Circle"} size={17} className={i.kind === "risk" ? "text-rose-300 shrink-0 mt-0.5" : "text-violet-300 shrink-0 mt-0.5"} />{i.text}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Лидеры рынка" icon="Trophy" right={<span className="text-xs text-white/40">по выручке 2025</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="text-left text-white/40 text-xs border-b border-white/10">
                    <th className="py-2 pr-2 font-normal w-8">#</th><th className="py-2 pr-3 font-normal">Компания</th><th className="py-2 pr-3 font-normal text-right">Выручка</th>
                    <th className="py-2 pr-3 font-normal text-right">Доля</th><th className="py-2 pr-3 font-normal text-right">Прибыль</th><th className="py-2 pr-3 font-normal text-right">Штат</th><th className="py-2 font-normal">Размер</th>
                  </tr>
                </thead>
                <tbody>
                  {d.top.map(c => (
                    <tr key={c.rank} className="border-b border-white/5">
                      <td className="py-2.5 pr-2 text-white/40">{c.rank}</td>
                      <td className="py-2.5 pr-3">
                        {c.locked ? (
                          <button onClick={unlock} className="flex items-center gap-2 text-white/40 hover:text-violet-300"><Icon name="Lock" size={13} /><span className="blur-[4px] select-none">ООО «Компания рынка»</span></button>
                        ) : (
                          <Link to={`/analytics/company/${c.inn}`} className="text-white hover:text-violet-300 font-medium">{prettyName(c.name)}</Link>
                        )}
                        {!c.locked && c.city && <div className="text-xs text-white/40">{c.city}</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-white whitespace-nowrap">{money(c.revenue)}</td>
                      <td className="py-2.5 pr-3 text-right text-cyan-300">{c.share?.toFixed(1)}%</td>
                      <td className={`py-2.5 pr-3 text-right whitespace-nowrap ${c.expenses != null && c.revenue - c.expenses < 0 ? "text-rose-300" : "text-emerald-300/90"}`}>
                        {c.expenses != null ? money(c.revenue - c.expenses) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-white/70">{c.staff ?? "—"}</td>
                      <td className="py-2.5 text-white/50 text-xs">{MSP_LABEL[c.msp_cat]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!full && (
              <button onClick={unlock} className="mt-4 w-full py-3 rounded-xl border border-dashed border-violet-500/40 text-sm text-violet-200 hover:bg-violet-500/10 flex items-center justify-center gap-2">
                <Icon name="Lock" size={14} />Ещё {Math.max(0, m.with_revenue - 3).toLocaleString("ru-RU")} компаний с ИНН и показателями — в полном отчёте
              </button>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Сегменты рынка" icon="Layers">
              {d.segments.length ? d.segments.slice(0, 10).map(s => (
                <Link key={s.code} to={`/analytics/market/${s.code}${region !== "RU" ? `/${region}` : ""}`} className="block hover:bg-white/[0.03] -mx-2 px-2 rounded-lg">
                  <BarRow label={<><span className="text-white/40 mr-1.5">{s.code}</span>{s.name || "—"}</>} value={Number(s.revenue)} max={maxSeg}
                    right={<>{money(s.revenue)} · <span className="text-white/45">{num(s.companies)}</span></>} />
                </Link>
              )) : <p className="text-sm text-white/40">Нет более детальных сегментов</p>}
            </Card>
            <Card title="Структура по размеру компаний" icon="PieChart">
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={mspPie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2} stroke="none">
                        {mspPie.map((_, i) => <Cell key={i} fill={PIE[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={TT} formatter={(v: number) => num(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  {mspPie.map((x, i) => (
                    <div key={x.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-white/70"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE[i] }} />{x.name}</span>
                      <span className="text-white">{pct(x.value, m.companies)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs text-white/50 mb-2">Распределение выручки по размеру компаний</div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.size_dist.map(s => ({ ...s, revenue: Number(s.revenue) }))}>
                      <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={TT} formatter={(v: number, n: string) => (n === "revenue" ? money(v) : num(v))} labelStyle={{ color: "#fff" }} />
                      <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title={d.region === "RU" ? "География рынка" : "Этот рынок в других регионах"} icon="Map">
              {d.geo.slice(0, 12).map(g => (
                <Link key={g.region} to={`/analytics/market/${okved}/${g.region}`} className="block hover:bg-white/[0.03] -mx-2 px-2 rounded-lg">
                  <BarRow label={g.name} value={Number(g.revenue)} max={maxGeo} color={g.region === region ? "bg-amber-400" : "bg-cyan-500/70"}
                    right={<>{money(g.revenue)} · <span className="text-white/45">{num(g.companies)}</span></>} />
                </Link>
              ))}
            </Card>
            <Card title="Приток новых игроков" icon="Sparkles" right={<span className="text-xs text-white/40">год входа в реестр МСП</span>}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.cohorts}>
                    <XAxis dataKey="y" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={TT} formatter={(v: number) => [num(v), "компаний"]} labelStyle={{ color: "#fff" }} />
                    <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                      {d.cohorts.map(c => <Cell key={c.y} fill={c.y >= 2024 ? "#f59e0b" : "#0891b2"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-white/40 mt-2">Оранжевым — компании, появившиеся в 2024–2026 годах. Рост столбцов — рынок привлекает новых участников.</p>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <Card title="Финансовое здоровье" icon="HeartPulse">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-white/55">Совокупные расходы</span><span className="text-white">{money(m.expenses)}</span></div>
                <div className="flex justify-between"><span className="text-white/55">Совокупный результат</span><span className={Number(m.revenue) - Number(m.expenses) >= 0 ? "text-emerald-300" : "text-rose-300"}>{money(Number(m.revenue) - Number(m.expenses))}</span></div>
                <div className="flex justify-between"><span className="text-white/55">Рентабельность по рынку</span><span className="text-white">{pct(Number(m.revenue) - Number(m.expenses), Number(m.revenue))}%</span></div>
                <div className="flex justify-between"><span className="text-white/55">Выручка на сотрудника</span><span className="text-white">{m.staff ? money(Number(m.revenue) / Number(m.staff)) : "—"}</span></div>
              </div>
            </Card>
            <Card title="Налоги и риски" icon="ShieldAlert">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-white/55">На упрощёнке (УСН, АУСН)</span><span className="text-white">{pct(m.usn, m.companies)}%</span></div>
                <div className="flex justify-between"><span className="text-white/55">Компаний с недоимкой</span><span className="text-rose-300">{num(m.with_debt)}</span></div>
                <div className="flex justify-between"><span className="text-white/55">Сумма недоимок</span><span className="text-white">{money(m.debt_sum)}</span></div>
              </div>
            </Card>
            <Card title="Господдержка 2024–2026" icon="Landmark">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-white/55">Получателей</span><span className="text-white">{num(d.grants?.n)}</span></div>
                <div className="flex justify-between"><span className="text-white/55">Сумма поддержки</span><span className="text-emerald-300">{money(d.grants?.s)}</span></div>
                <Link to="/radar" className="text-xs text-violet-300 hover:text-white inline-flex items-center gap-1">Смотреть получателей в Радаре<Icon name="ArrowRight" size={12} /></Link>
              </div>
            </Card>
          </div>

          {!full && (
            <Card>
              <Locked onUnlock={unlock} label="Сравнение с конкурентами и выводы аналитика — в полном отчёте">
                <div className="grid md:grid-cols-3 gap-4 py-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-white/10" />)}
                </div>
              </Locked>
            </Card>
          )}

          <div className="bg-gradient-to-br from-violet-600/25 to-cyan-600/10 border border-violet-500/40 rounded-3xl p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <h2 className="font-['Oswald',sans-serif] text-2xl md:text-3xl font-bold mb-3">Полный отчёт о рынке «{d.okved_name}»</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {INCLUDES.map(t => <li key={t} className="flex gap-2 text-sm text-white/75"><Icon name="Check" size={16} className="text-emerald-300 shrink-0 mt-0.5" />{t}</li>)}
              </ul>
            </div>
            <button onClick={unlock} className="bg-white text-[#10101c] hover:bg-violet-100 px-7 py-4 rounded-2xl font-semibold flex items-center gap-2 whitespace-nowrap">
              Заказать за {PRICES.market.toLocaleString("ru-RU")} ₽<Icon name="ArrowRight" size={18} />
            </button>
          </div>
          <SourceNote />
        </div>
      )}

      {order && d && (
        <BizOrderModal reportType="market" reportKey={`${okved}:${region}`} title={`Отчёт о рынке: ${d.okved_name} — ${d.region_name}`}
          price={PRICES.market} includes={INCLUDES} onClose={() => setOrder(false)} />
      )}
    </BizShell>
  );
}
