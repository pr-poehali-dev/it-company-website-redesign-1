import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { BarRow, Card, INSIGHT_ICON, Kpi, SourceNote } from "@/components/biz/BizUi";
import BizOrderModal from "@/components/biz/BizOrderModal";
import DbFilterPanel from "@/components/biz/DbFilterPanel";
import { DatasetSchema } from "@/components/biz/SeoSchema";
import { DbFilters, DbResponse, MSP_LABEL, bizGet, decodeFilters, money, num, pct, prettyName } from "@/components/biz/bizApi";

const TT = { background: "#10101c", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12 };
const PIE = ["#7c3aed", "#0891b2", "#a78bfa", "#22d3ee", "#475569"];
const SORTS = [["revenue", "Выручка"], ["profit", "Прибыль"], ["staff", "Штат"], ["new", "Новые"], ["debt", "Долги"]];

const INCLUDES = [
  "Все компании базы с ИНН, названием, городом и ОКВЭД",
  "Выручка, расходы и результат 2025, штат, налоговый режим, недоимка",
  "Руководитель, сайт, телефон и почта — где найдены",
  "Excel с фильтрами + PDF-сводка с выводами",
];

function describe(f: DbFilters, regionNames: Record<string, string>): string {
  const p: string[] = [];
  if (f.okved2?.length) p.push(`ОКВЭД ${f.okved2.join(", ")}`);
  if (f.okved?.length) p.push(`коды ${f.okved.join(", ")}`);
  if (f.region?.length) p.push(f.region.map(r => regionNames[r] || r).join(", "));
  if (f.min_revenue) p.push(`выручка от ${money(f.min_revenue)}`);
  if (f.max_revenue) p.push(`до ${money(f.max_revenue)}`);
  if (f.min_staff) p.push(`штат от ${f.min_staff}`);
  if (f.max_staff) p.push(`штат до ${f.max_staff}`);
  if (f.msp_cat?.length) p.push(f.msp_cat.map(c => MSP_LABEL[Number(c)]).join(", "));
  if (f.tax_mode?.length) p.push(f.tax_mode.join(", "));
  if (f.profitable) p.push("прибыльные");
  if (f.no_debt) p.push("без недоимки");
  if (f.grants) p.push("с господдержкой");
  if (f.has_contacts) p.push("с контактами");
  if (f.msp_year_from) p.push(`новые с ${f.msp_year_from}`);
  return p.join(" · ") || "Все компании";
}

export default function DatabaseView() {
  const { slug = "" } = useParams();
  const isConstructor = slug === "constructor";
  const [sp, setSp] = useSearchParams();
  const extra = useMemo(() => decodeFilters(sp.get("f")), [sp]);
  const sort = sp.get("sort") || "revenue";
  const page = Number(sp.get("page")) || 1;
  const [d, setD] = useState<DbResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(false);

  useEffect(() => {
    if (isConstructor && !Object.keys(extra).length) { setD(null); setLoading(false); setError(""); return; }
    setLoading(true);
    setError("");
    const params: Record<string, string> = { action: "db", sort, page: String(page) };
    if (!isConstructor) params.slug = slug;
    if (Object.keys(extra).length) params.filters = JSON.stringify(extra);
    bizGet<DbResponse>(params).then(r => (r.error ? setError(r.error) : setD(r))).catch(() => setError("Не удалось загрузить")).finally(() => setLoading(false));
  }, [slug, isConstructor, extra, sort, page]);

  const update = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    setSp(n, { replace: false });
  };
  const applyFilters = (f: DbFilters) => {
    const own = { ...f };
    if (d?.meta) Object.keys(d.meta.filters || {}).forEach(k => { if (JSON.stringify((d.meta!.filters as Record<string, unknown>)[k]) === JSON.stringify((f as Record<string, unknown>)[k])) delete (own as Record<string, unknown>)[k]; });
    update({ f: Object.keys(own).length ? JSON.stringify(own) : null, page: null });
  };

  const a = d?.analysis;
  const m = a?.metrics;
  const regionNames = useMemo(() => Object.fromEntries((a?.by_region || []).map(r => [r.region, r.name])), [a]);
  const title = d?.meta ? d.meta.title : "Своя база компаний";
  const fullF = d?.filters || extra;
  const desc = describe(fullF, regionNames);
  const mspPie = m ? [{ name: "Микро", value: m.micro }, { name: "Малые", value: m.small }, { name: "Средние", value: m.medium }, { name: "Крупные", value: m.non_msp }].filter(x => x.value > 0) : [];
  const maxReg = Math.max(1, ...(a?.by_region || []).slice(0, 12).map(r => Number(r.revenue)));
  const maxOk = Math.max(1, ...(a?.by_okved || []).slice(0, 12).map(r => Number(r.revenue)));
  const pages = m ? Math.min(50, Math.ceil(m.companies / 25)) : 1;
  const panelValue = { ...(d?.meta?.filters || {}), ...extra };

  return (
    <BizShell title={`${title}: ${m ? num(m.companies) + " компаний, " : ""}анализ и выгрузка | МАТ-Лабс`}
      description={d?.meta?.description || "Конструктор базы компаний России: отрасль, регион, выручка, штат, налоги. Бесплатный анализ, выгрузка в Excel."}
      path={`/analytics/databases/${slug}`} noindex={isConstructor || Object.keys(extra).length > 0 || page > 1 || sort !== "revenue"}
      crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Базы компаний", href: "/analytics/databases" }, { label: title }]}>

      {d?.meta && m && <DatasetSchema name={`База компаний: ${d.meta.title}`} url={`https://mat-labs.ru/analytics/databases/${slug}`}
        description={`${num(m.companies)} компаний, выручка ${money(m.revenue)} за 2025 год. ${d.meta.description}`} />}
      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        <aside className="lg:sticky lg:top-4 self-start space-y-3">
          <DbFilterPanel value={panelValue} onApply={applyFilters} />
          <Link to="/analytics/databases" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white px-1"><Icon name="ArrowLeft" size={14} />Все базы</Link>
        </aside>

        <div className="min-w-0 space-y-5">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-violet-300 mb-1 flex items-center gap-1.5"><Icon name={d?.meta?.icon || "SlidersHorizontal"} fallback="Database" size={14} />{d?.meta ? d.meta.subtitle : "Конструктор базы"}</div>
              <h1 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold leading-tight">{title}</h1>
              <p className="text-white/55 text-sm mt-1">{desc}</p>
            </div>
            {d && !d.full_access && m && m.companies > 0 && (
              <button onClick={() => setOrder(true)} className="shrink-0 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-5 py-3.5 rounded-2xl font-semibold text-white flex items-center gap-2 shadow-lg shadow-violet-600/30">
                <Icon name="FileSpreadsheet" size={18} />Выгрузить {num(m.companies)} · {d.price.toLocaleString("ru-RU")} ₽
              </button>
            )}
          </header>

          {isConstructor && !Object.keys(extra).length && (
            <Card>
              <div className="text-center py-10">
                <Icon name="SlidersHorizontal" size={32} className="mx-auto text-violet-300 mb-3" />
                <div className="text-white font-semibold text-lg mb-1">Соберите свою базу</div>
                <p className="text-white/55 text-sm max-w-md mx-auto">Выберите отрасли, регионы, размер выручки и штата слева и нажмите «Показать» — анализ построится сразу, бесплатно.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {[
                    ["ИТ-компании Москвы с выручкой от 120 млн", { okved2: ["62"], region: ["77"], min_revenue: 120000000 }],
                    ["Строители Урала без долгов", { okved2: ["41", "42", "43"], region: ["66", "74", "59"], no_debt: true }],
                    ["Новые производства с оборотом", { okved2: ["10", "22", "25", "28"], msp_year_from: 2024, min_revenue: 10000000 }],
                  ].map(([l, f]) => (
                    <button key={l as string} onClick={() => update({ f: JSON.stringify(f) })} className="text-sm px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/75 hover:border-violet-500/50">{l as string}</button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {error && <Card><p className="text-white/60 text-center py-6">{error}</p></Card>}
          {loading && <div className="space-y-4"><div className="h-36 rounded-2xl bg-white/5 animate-pulse" /><div className="h-72 rounded-2xl bg-white/5 animate-pulse" /></div>}

          {!loading && d && m && m.companies === 0 && (
            <Card><p className="text-white/60 text-center py-6">По этим условиям компаний нет. Ослабьте фильтры.</p></Card>
          )}

          {!loading && d && m && a && m.companies > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi value={num(m.companies)} label="компаний в базе" sub={`с выручкой: ${num(m.with_revenue)}`} />
                <Kpi value={money(m.revenue)} label="суммарная выручка 2025" />
                <Kpi value={money(m.median_revenue)} label="медианная выручка" />
                <Kpi value={num(m.staff)} label="сотрудников" />
                <Kpi value={`${pct(m.profitable, m.with_revenue)}%`} label="доходы выше расходов" accent="from-emerald-300 to-cyan-300" />
                <Kpi value={`${pct(Number(m.revenue) - Number(m.expenses), Number(m.revenue))}%`} label="рентабельность базы" accent="from-emerald-300 to-cyan-300" />
                <Kpi value={`${pct(m.new_3y, m.companies)}%`} label="новые с 2024 года" accent="from-amber-200 to-orange-300" />
                <Kpi value={`${pct(m.with_debt, m.companies)}%`} label="с налоговой недоимкой" sub={money(m.debt_sum)} accent="from-rose-300 to-orange-300" />
              </div>

              {d.insights.length > 0 && (
                <Card title="Выводы по базе" icon="Lightbulb">
                  <div className="grid md:grid-cols-2 gap-3">
                    {d.insights.filter(i => i.kind !== "geo").map(i => (
                      <div key={i.text} className="flex gap-3 text-sm text-white/80 bg-white/[0.02] rounded-xl p-3">
                        <Icon name={INSIGHT_ICON[i.kind] || "Circle"} size={17} className={i.kind === "risk" ? "text-rose-300 shrink-0 mt-0.5" : "text-violet-300 shrink-0 mt-0.5"} />{i.text}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="grid xl:grid-cols-2 gap-5">
                <Card title="Регионы" icon="Map">
                  {a.by_region.slice(0, 12).map(r => (
                    <BarRow key={r.region} label={r.name} value={Number(r.revenue)} max={maxReg} color="bg-cyan-500/70"
                      right={<>{money(r.revenue)} · <span className="text-white/45">{num(r.companies)}</span></>} />
                  ))}
                </Card>
                <Card title="Отрасли и виды деятельности" icon="Factory">
                  {a.by_okved.slice(0, 12).map(o => (
                    <Link key={o.code} to={`/analytics/market/${o.code}`} className="block hover:bg-white/[0.03] -mx-2 px-2 rounded-lg">
                      <BarRow label={<><span className="text-white/40 mr-1.5">{o.code}</span>{o.name || "—"}</>} value={Number(o.revenue)} max={maxOk}
                        right={<>{money(o.revenue)} · <span className="text-white/45">{num(o.companies)}</span></>} />
                    </Link>
                  ))}
                </Card>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <Card title="Размер компаний" icon="PieChart">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={mspPie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2} stroke="none">
                          {mspPie.map((_, i) => <Cell key={i} fill={PIE[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={TT} formatter={(v: number) => num(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1 text-xs mt-2">
                    {mspPie.map((x, i) => <div key={x.name} className="flex justify-between"><span className="flex items-center gap-1.5 text-white/65"><span className="w-2 h-2 rounded-sm" style={{ background: PIE[i] }} />{x.name}</span><span className="text-white">{pct(x.value, m.companies)}%</span></div>)}
                  </div>
                </Card>
                <Card title="Выручка по размеру" icon="BarChart3">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={a.size_dist.map(s => ({ ...s, revenue: Number(s.revenue), short: s.label.replace(" млн", "").replace(" млрд", "B").replace("более ", ">").replace("до ", "<") }))}>
                        <XAxis dataKey="short" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={36} />
                        <YAxis hide />
                        <Tooltip contentStyle={TT} formatter={(v: number) => money(v)} labelFormatter={(_, p) => (p?.[0]?.payload?.label ? `Выручка компании: ${p[0].payload.label}` : "")} labelStyle={{ color: "#fff" }} />
                        <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Приток новых компаний" icon="Sparkles">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={a.cohorts}>
                        <XAxis dataKey="y" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={TT} formatter={(v: number) => [num(v), "компаний"]} labelStyle={{ color: "#fff" }} />
                        <Bar dataKey="n" radius={[6, 6, 0, 0]}>{a.cohorts.map(c => <Cell key={c.y} fill={c.y >= 2024 ? "#f59e0b" : "#0891b2"} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card title="Компании базы" icon="Table" right={
                <div className="flex gap-1 flex-wrap">
                  {SORTS.map(([k, l]) => (
                    <button key={k} onClick={() => update({ sort: k === "revenue" ? null : k, page: null })} className={`text-xs px-2.5 py-1.5 rounded-lg ${sort === k ? "bg-violet-600 text-white" : "bg-white/5 text-white/55 hover:text-white"}`}>{l}</button>
                  ))}
                </div>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="text-left text-white/40 text-xs border-b border-white/10">
                        <th className="py-2 pr-3 font-normal">Компания</th><th className="py-2 pr-3 font-normal">Регион</th><th className="py-2 pr-3 font-normal text-right">Выручка</th>
                        <th className="py-2 pr-3 font-normal text-right">Дох. − расх.</th><th className="py-2 pr-3 font-normal text-right">Штат</th><th className="py-2 pr-3 font-normal">Налоги</th><th className="py-2 font-normal text-right">Недоимка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.items.map((c, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-2.5 pr-3">
                            {c.locked ? (
                              <button onClick={() => setOrder(true)} className="flex items-center gap-2 text-white/40 hover:text-violet-300"><Icon name="Lock" size={13} /><span className="blur-[4px] select-none">ООО «Компания базы»</span></button>
                            ) : <Link to={`/analytics/company/${c.inn}`} className="text-white hover:text-violet-300">{prettyName(c.name)}</Link>}
                            <div className="text-[11px] text-white/35">{c.okved}{c.city && !c.locked ? ` · ${c.city}` : ""}</div>
                          </td>
                          <td className="py-2.5 pr-3 text-white/55 text-xs">{c.region_name}</td>
                          <td className="py-2.5 pr-3 text-right text-white whitespace-nowrap">{c.revenue != null ? money(c.revenue) : "—"}</td>
                          <td className={`py-2.5 pr-3 text-right whitespace-nowrap ${c.revenue != null && c.expenses != null && c.revenue - c.expenses < 0 ? "text-rose-300" : "text-emerald-300/90"}`}>{c.revenue != null && c.expenses != null ? money(c.revenue - c.expenses) : "—"}</td>
                          <td className="py-2.5 pr-3 text-right text-white/70">{c.staff ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-white/50 text-xs">{c.tax_mode || "—"}</td>
                          <td className={`py-2.5 text-right text-xs whitespace-nowrap ${c.tax_debt ? "text-rose-300" : "text-white/35"}`}>{c.tax_debt ? money(c.tax_debt) : "нет"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                  {!d.full_access ? (
                    <button onClick={() => setOrder(true)} className="text-sm text-violet-200 flex items-center gap-1.5 hover:text-white"><Icon name="Lock" size={14} />Первые 10 — открыто, все {num(m.companies)} — в выгрузке</button>
                  ) : <span className="text-xs text-emerald-300">Полный доступ администратора</span>}
                  {pages > 1 && (
                    <div className="flex items-center gap-2">
                      <button disabled={page <= 1} onClick={() => update({ page: page > 2 ? String(page - 1) : null })} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center disabled:opacity-30" aria-label="Назад"><Icon name="ChevronLeft" size={16} /></button>
                      <span className="text-sm text-white/55">{page} из {pages}</span>
                      <button disabled={page >= pages} onClick={() => update({ page: String(page + 1) })} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center disabled:opacity-30" aria-label="Вперёд"><Icon name="ChevronRight" size={16} /></button>
                    </div>
                  )}
                </div>
              </Card>

              {!d.full_access && (
                <div className="bg-gradient-to-br from-violet-600/25 to-cyan-600/10 border border-violet-500/40 rounded-3xl p-6 grid md:grid-cols-[1fr_auto] gap-5 items-center">
                  <div>
                    <h2 className="font-['Oswald',sans-serif] text-2xl font-bold mb-2">Выгрузка базы: {num(m.companies)} компаний</h2>
                    <ul className="grid sm:grid-cols-2 gap-1.5">{INCLUDES.map(t => <li key={t} className="flex gap-2 text-sm text-white/75"><Icon name="Check" size={15} className="text-emerald-300 shrink-0 mt-0.5" />{t}</li>)}</ul>
                  </div>
                  <button onClick={() => setOrder(true)} className="bg-white text-[#10101c] hover:bg-violet-100 px-6 py-3.5 rounded-2xl font-semibold whitespace-nowrap">Заказать за {d.price.toLocaleString("ru-RU")} ₽</button>
                </div>
              )}
              <SourceNote />
            </>
          )}
        </div>
      </div>

      {order && d && m && (
        <BizOrderModal reportType="database" reportKey={JSON.stringify({ slug: d.meta?.slug || "", filters: d.filters })}
          title={`Выгрузка базы «${title}»: ${num(m.companies)} компаний (${desc})`} price={d.price} includes={INCLUDES}
          onClose={() => setOrder(false)} />
      )}
    </BizShell>
  );
}
