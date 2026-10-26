import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card, Kpi, BarRow, SourceNote } from "@/components/biz/BizUi";
import CompanySearch from "@/components/biz/CompanySearch";
import { ItemListSchema } from "@/components/biz/SeoSchema";
import { Overview, bizGet, money, num, pct } from "@/components/biz/bizApi";

const PRODUCTS = [
  { icon: "PieChart", title: "Отчёт о рынке", price: "4 900 ₽", to: "/analytics/market", text: "Объём, лидеры и их доли, концентрация, сегменты, география, доля новых игроков, риски — для любой отрасли и региона" },
  { icon: "Building2", title: "Отчёт о компании", price: "1 490 ₽", to: "/analytics/company", text: "Выручка, прибыль, рентабельность, место среди конкурентов, господдержка, руководитель — по ИНН" },
  { icon: "ShieldCheck", title: "Проверка контрагента", price: "490 ₽", to: "/analytics/company", text: "Статус в ЕГРЮЛ, налоговые долги, убыточность, признаки транзитной компании — индекс риска 0–100" },
  { icon: "Microscope", title: "Аналитика под ключ", price: "от 9 900 ₽", to: "/analytics/services", text: "Исследования рынка, опросы, тайный покупатель, парсинг, обогащение базы, дашборды — с калькулятором цены" },
];

const COLORS = ["#7c3aed", "#0891b2", "#6d28d9", "#0e7490", "#5b21b6", "#155e75", "#4c1d95", "#164e63"];

function TreeCell(props: { x: number; y: number; width: number; height: number; index: number; name: string; value: number }) {
  const { x, y, width, height, index, name, value } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} stroke="#080812" strokeWidth={2} rx={6} />
      {width > 80 && height > 36 && (
        <>
          <text x={x + 8} y={y + 18} fill="#fff" fontSize={12} fontWeight={600}>{name.length > width / 7 ? name.slice(0, Math.floor(width / 7)) + "…" : name}</text>
          <text x={x + 8} y={y + 34} fill="rgba(255,255,255,.7)" fontSize={11}>{money(value)}</text>
        </>
      )}
    </g>
  );
}

export default function AnalyticsHome() {
  const [d, setD] = useState<Overview | null>(null);
  const navigate = useNavigate();
  useEffect(() => { bizGet<Overview>({ action: "overview" }).then(setD); }, []);

  const sections = useMemo(() => {
    if (!d) return [];
    const m = new Map<string, number>();
    d.industries.forEach(i => m.set(i.section || "Прочее", (m.get(i.section || "Прочее") || 0) + Number(i.revenue)));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [d]);

  const t = d?.total;
  const maxReg = Math.max(1, ...(d?.regions || []).slice(0, 15).map(r => Number(r.revenue)));
  const maxInd = Math.max(1, ...(d?.industries || []).slice(0, 12).map(r => Number(r.revenue)));

  return (
    <BizShell title="Бизнес-аналитика: рынки, компании, проверка контрагентов — МАТ-Лабс"
      description="Аналитика по 2,16 млн компаний России на открытых данных ФНС за 2025 год: объём рынков по отраслям и регионам, лидеры, финансы компаний, проверка контрагентов."
      path="/analytics" crumbs={[{ label: "Бизнес-аналитика" }]}>

      <ItemListSchema name="Бизнес-аналитика МАТ-Лабс" items={[
        { name: "Отчёты о рынках", url: "https://mat-labs.ru/analytics/market" },
        { name: "Базы компаний", url: "https://mat-labs.ru/analytics/databases" },
        { name: "Отчёт о компании и проверка контрагента", url: "https://mat-labs.ru/analytics/company" },
        { name: "Рейтинги компаний", url: "https://mat-labs.ru/analytics/rating" },
        { name: "Облачный BI", url: "https://mat-labs.ru/analytics/bi" },
        { name: "Аналитика под ключ", url: "https://mat-labs.ru/analytics/services" },
        { name: "Тарифы", url: "https://mat-labs.ru/analytics/prices" },
      ]} />
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 bg-white/[0.04] px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-5">
          <Icon name="Database" size={14} />Данные ФНС за 2025 год · обновлено 25.09.2026
        </div>
        <h1 className="font-['Oswald',sans-serif] text-4xl md:text-6xl font-bold leading-[1.05] mb-4 max-w-4xl">
          Аналитика рынков и компаний России <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">за минуту</span>
        </h1>
        <p className="text-white/60 text-lg max-w-3xl mb-7">
          Сколько зарабатывает отрасль в вашем регионе, кто лидер и с какой долей, как устроен конкурент и можно ли ему доверять — по открытым данным ФНС, без звонков и ожидания.
        </p>
        <div className="max-w-2xl mb-8"><CompanySearch onPick={inn => navigate(`/analytics/company/${inn}`)} big /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi value={t ? num(t.companies) : "2 160 938"} label="компаний в базе" />
          <Kpi value={t ? money(t.revenue) : "—"} label="суммарная выручка 2025" />
          <Kpi value={t ? num(t.staff) : "—"} label="сотрудников" />
          <Kpi value={t ? `${pct(t.profitable, t.with_revenue)}%` : "—"} label="компаний с доходом выше расходов" />
        </div>
      </header>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {PRODUCTS.map(p => (
          <Link key={p.title} to={p.to} className="group bg-white/[0.03] border border-white/10 hover:border-violet-500/50 rounded-2xl p-5 flex flex-col transition-colors">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-3"><Icon name={p.icon} size={20} className="text-violet-300" /></div>
            <div className="font-semibold text-white">{p.title}</div>
            <div className="text-cyan-300 text-sm mb-2">{p.price}</div>
            <p className="text-sm text-white/55 leading-relaxed flex-1">{p.text}</p>
            <div className="text-sm text-violet-300 mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">Открыть<Icon name="ArrowRight" size={14} /></div>
          </Link>
        ))}
      </section>

      {d && (
        <>
          <Card title="Структура экономики по выручке 2025 года" icon="LayoutGrid" className="mb-5">
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={sections} dataKey="value" nameKey="name" content={<TreeCell x={0} y={0} width={0} height={0} index={0} name="" value={0} />} isAnimationActive={false}>
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "#10101c", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} />
                </Treemap>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-white/40 mt-3">Около половины выручки приходится на компании без кода ОКВЭД в реестре МСП (крупные холдинги, банки, госкомпании) — в разрезе отраслей они не показаны.</p>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <Card title="Крупнейшие отрасли" icon="Factory" right={<Link to="/analytics/market" className="text-xs text-violet-300 hover:text-white">все 88 →</Link>}>
              {d.industries.slice(0, 12).map(i => (
                <Link key={i.okved2} to={`/analytics/market/${i.okved2}`} className="block hover:bg-white/[0.03] -mx-2 px-2 rounded-lg">
                  <BarRow label={<><span className="text-white/40 mr-1.5">{i.okved2}</span>{i.name}</>} value={Number(i.revenue)} max={maxInd}
                    right={<>{money(i.revenue)} · <span className="text-white/45">{num(i.companies)}</span></>} />
                </Link>
              ))}
            </Card>
            <Card title="Регионы по выручке компаний" icon="Map" right={<span className="text-xs text-white/40">{d.regions.length} регионов</span>}>
              {d.regions.slice(0, 15).map(r => (
                <Link key={r.region} to={`/analytics/market/ALL/${r.region}`} className="block hover:bg-white/[0.03] -mx-2 px-2 rounded-lg">
                  <BarRow label={r.name} value={Number(r.revenue)} max={maxReg} color="bg-cyan-500/70"
                    right={<>{money(r.revenue)} · <span className="text-white/45">{num(r.companies)}</span></>} />
                </Link>
              ))}
            </Card>
          </div>
        </>
      )}

      <Card className="mb-8">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Search", "Найдите отрасль или компанию", "Выберите код ОКВЭД и регион или введите название, ИНН"],
            ["Eye", "Смотрите превью бесплатно", "Ключевые цифры, графики, 3 лидера рынка и индекс риска — без регистрации"],
            ["FileDown", "Закажите полный отчёт", "Все лидеры с ИНН, конкуренты, контакты, выгрузка в Excel — по счёту в течение дня"],
          ].map(([icon, h, tx], i) => (
            <div key={h} className="flex gap-3">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-300 font-['Oswald',sans-serif] font-bold">{i + 1}</div>
              <div><div className="font-semibold text-white flex items-center gap-1.5"><Icon name={icon} size={14} className="text-violet-300" />{h}</div><p className="text-sm text-white/55 mt-1">{tx}</p></div>
            </div>
          ))}
        </div>
      </Card>
      <SourceNote />
    </BizShell>
  );
}
