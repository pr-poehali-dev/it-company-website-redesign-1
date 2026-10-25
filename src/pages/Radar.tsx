import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import RadarFilters from "@/components/radar/RadarFilters";
import RadarList from "@/components/radar/RadarList";
import RadarPricing from "@/components/radar/RadarPricing";
import RadarAccessForm from "@/components/radar/RadarAccessForm";
import {
  Facets, Filters, EMPTY_FILTERS, RadarItem, radarGet, fmtMoney, fmtDate,
} from "@/components/radar/radarApi";

const PAGE_URL = "https://mat-labs.ru/radar";
const TITLE = "Радар заказчиков — 18 тыс. компаний, получивших господдержку в 2024–2026 гг.";
const DESCRIPTION =
  "Каталог получателей грантов и субсидий: кто получил деньги, сколько и когда. Фильтры по региону, отрасли и сумме. Компании с бюджетом на закупки — для отделов продаж B2B.";

const STEPS = [
  { icon: "Landmark", title: "Компания получает деньги", text: "Грант, субсидию или льготу от фонда, министерства или региона — это видно в открытом реестре ФНС" },
  { icon: "ShoppingCart", title: "У неё появляется бюджет", text: "Оборудование, стройка, ИТ, сертификация и подрядчики — деньги нужно потратить и отчитаться" },
  { icon: "Radar", title: "Вы приходите первым", text: "Пока о бюджете не знают конкуренты: фильтр по нише, свежие выплаты, контакты руководителя" },
];

const COMPARE = [
  ["Открытый каталог без регистрации", true, false],
  ["Цены на сайте и пробный доступ без звонка", true, false],
  ["Сумма и дата господдержки по каждой компании", true, false],
  ["Сигналы: свежие деньги, крупная выплата, рост штата", true, false],
  ["Проверенные обзвоном контакты по стройпроектам", false, true],
  ["Подписка", "от 4 900 ₽/мес", "от 59 100 ₽ за 3 мес"],
] as const;

function filtersFromParams(sp: URLSearchParams): Filters {
  const f = { ...EMPTY_FILTERS };
  (Object.keys(f) as (keyof Filters)[]).forEach(k => { const v = sp.get(k); if (v) f[k] = v; });
  return f;
}

export default function Radar() {
  const [sp, setSp] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(sp));
  const [page, setPage] = useState(Number(sp.get("page")) || 1);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [total, setTotal] = useState(0);
  const [sum, setSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => { radarGet<Facets>({ action: "facets" }).then(setFacets).catch(() => setFacets(null)); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params: Record<string, string> = { ...filters, page: String(page) };
      setSp(Object.fromEntries(Object.entries(params).filter(([k, v]) => v && !(k === "sort" && v === "fresh") && !(k === "page" && v === "1"))), { replace: true });
      radarGet<{ items: RadarItem[]; total: number; sum: number }>({ action: "list", ...params })
        .then(d => { setItems(d.items || []); setTotal(d.total || 0); setSum(Number(d.sum) || 0); })
        .finally(() => setLoading(false));
    }, filters.q ? 350 : 0);
    return () => clearTimeout(t);
  }, [filters, page, setSp]);

  const changeFilters = (f: Filters) => { setFilters(f); setPage(1); };
  const pages = Math.max(1, Math.ceil(total / 30));
  const filtersLabel = useMemo(() => Object.entries(filters).filter(([k, v]) => v && k !== "sort").map(([k, v]) => `${k}=${v}`).join("; "), [filters]);
  const tot = facets?.totals;
  const maxMonth = Math.max(1, ...(facets?.months || []).map(m => m.n));

  const openPlan = (p: string) => {
    if (p === "Каталог") { document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); return; }
    setPlan(p);
  };

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-['Golos_Text',sans-serif] overflow-x-hidden">
        <div className="absolute inset-x-0 top-0 h-[700px] opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 relative">
          <PageBreadcrumbs items={[{ label: "Радар заказчиков" }]} className="mb-8" />

          <header className="mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
              <Icon name="Radar" size={14} />
              Радар заказчиков · данные ФНС {tot?.updated ? `на ${fmtDate(tot.updated)}` : ""}
            </div>
            <h1 className="font-['Oswald',sans-serif] text-4xl md:text-6xl font-bold leading-[1.05] mb-5 max-w-4xl">
              Компании, которые <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">только что получили деньги</span> от государства
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-3xl">
              Гранты, субсидии и льготы 2024–2026 годов: кто получил, сколько и когда. У этих компаний есть бюджет на оборудование,
              подрядчиков и ИТ — найдите их раньше конкурентов.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <a href="#catalog" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-colors px-7 py-4 rounded-2xl font-semibold text-white shadow-lg shadow-violet-600/30 flex items-center gap-2">
                <Icon name="Search" size={18} />Открыть каталог бесплатно
              </a>
              <button onClick={() => setPlan("Старт")} className="bg-white/[0.04] backdrop-blur-sm border border-white/20 px-7 py-4 rounded-2xl font-semibold text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                Пробный доступ к контактам<Icon name="ArrowRight" size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                [tot ? tot.companies.toLocaleString("ru-RU") : "18 219", "компаний-получателей"],
                [tot ? fmtMoney(tot.total) : "189 млрд ₽", "господдержки за 2024–2026"],
                [tot ? tot.with_contacts.toLocaleString("ru-RU") : "—", "с телефоном или почтой — и каждый день больше"],
                [tot ? tot.with_head.toLocaleString("ru-RU") : "—", "с руководителем из ЕГРЮЛ"],
              ].map(([v, l]) => (
                <div key={l} className="bg-white/[0.04] backdrop-blur-sm border border-violet-500/25 rounded-2xl p-5">
                  <div className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">{v}</div>
                  <div className="text-white/50 text-sm mt-1">{l}</div>
                </div>
              ))}
            </div>
          </header>

          <section className="mb-14 grid md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center"><Icon name={s.icon} size={20} className="text-violet-300" /></div>
                  <span className="text-white/30 font-['Oswald',sans-serif] text-2xl">0{i + 1}</span>
                </div>
                <div className="font-semibold text-white mb-1">{s.title}</div>
                <p className="text-sm text-white/55 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </section>

          <section id="catalog" className="mb-16 scroll-mt-6">
            <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
              <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold">Каталог получателей</h2>
              <div className="text-sm text-white/55">
                Найдено: <span className="text-white font-semibold">{total.toLocaleString("ru-RU")}</span> компаний
                {sum ? <> · <span className="text-white font-semibold">{fmtMoney(sum)}</span></> : null}
              </div>
            </div>
            <div className="grid lg:grid-cols-[1fr_300px] gap-5">
              <div className="space-y-4 min-w-0">
                <RadarFilters facets={facets} value={filters} onChange={changeFilters} />
                <RadarList items={items} loading={loading} />
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button onClick={() => { setPage(p => Math.max(1, p - 1)); document.getElementById("catalog")?.scrollIntoView(); }} disabled={page === 1}
                      className="w-10 h-10 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Назад">
                      <Icon name="ChevronLeft" size={18} />
                    </button>
                    <span className="text-sm text-white/60">{page} из {Math.min(pages, 200)}</span>
                    <button onClick={() => { setPage(p => Math.min(Math.min(pages, 200), p + 1)); document.getElementById("catalog")?.scrollIntoView(); }} disabled={page >= Math.min(pages, 200)}
                      className="w-10 h-10 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Вперёд">
                      <Icon name="ChevronRight" size={18} />
                    </button>
                  </div>
                )}
              </div>
              <aside className="space-y-4">
                <div className="rounded-2xl p-5 bg-gradient-to-b from-violet-600/25 to-violet-600/5 border border-violet-500/40">
                  <Icon name="Lock" size={20} className="text-violet-200 mb-2" />
                  <div className="font-semibold text-white mb-1">Контакты и выгрузка</div>
                  <p className="text-sm text-white/65 mb-4">Руководитель, телефоны, email и сайт, выгрузка выборки в Excel — в подписке от 4 900 ₽ в месяц.</p>
                  <button onClick={() => setPlan("Старт")} className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-colors px-4 py-2.5 rounded-xl text-sm font-semibold text-white">Попробовать 3 дня</button>
                </div>
                {facets && (
                  <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                    <div className="text-sm font-semibold text-white mb-3">Новые получатели по месяцам</div>
                    <div className="flex items-end gap-1 h-24">
                      {facets.months.map(m => (
                        <div key={m.m} title={`${m.m}: ${m.n}`} className="flex-1 bg-violet-500/60 rounded-t hover:bg-violet-400" style={{ height: `${Math.max(4, (m.n / maxMonth) * 100)}%` }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-white/35 mt-1"><span>янв 2025</span><span>сен 2026</span></div>
                    <p className="text-xs text-white/45 mt-3">Пики — апрель–май и декабрь: в эти месяцы у получателей появляются бюджеты.</p>
                  </div>
                )}
                {facets && (
                  <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                    <div className="text-sm font-semibold text-white mb-3">Топ отраслей по сумме</div>
                    <div className="space-y-2">
                      {[...facets.industry].sort((a, b) => b.s - a.s).slice(0, 6).map(f => (
                        <button key={f.v} onClick={() => changeFilters({ ...filters, industry: f.v })}
                          className="w-full flex justify-between gap-2 text-xs text-left hover:text-white text-white/65">
                          <span className="truncate">{f.v}</span><span className="text-white/90 shrink-0">{fmtMoney(f.s)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold mb-6">Тарифы</h2>
            <RadarPricing onSelect={openPlan} />
            <p className="text-xs text-white/40 mt-3">Цены с НДС. Оплата по счёту для юрлиц. Пробный доступ — 3 дня, без привязки карты.</p>
          </section>

          <section className="mb-16">
            <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold mb-6">Чем Радар отличается от баз строительных проектов</h2>
            <div className="bg-white/[0.04] backdrop-blur-sm border border-violet-500/25 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-white/45 border-b border-white/10">
                    <th className="p-4 font-normal"></th>
                    <th className="p-4 font-semibold text-white">Радар заказчиков</th>
                    <th className="p-4 font-normal">Типичная база стройпроектов</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([label, a, b]) => (
                    <tr key={label} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-white/75">{label}</td>
                      {[a, b].map((v, i) => (
                        <td key={i} className="p-4">
                          {typeof v === "boolean"
                            ? <Icon name={v ? "Check" : "Minus"} size={18} className={v ? "text-emerald-300" : "text-white/25"} />
                            : <span className={i === 0 ? "text-cyan-300" : "text-white/60"}>{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-white/40 mt-3">Честно: проверенных обзвоном контактов по стройкам у нас пока нет — Радар сильнее на этапе «у компании появились деньги».</p>
          </section>

          <section className="mb-10 bg-white/[0.04] backdrop-blur-sm border border-violet-500/25 rounded-3xl p-6 md:p-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-['Oswald',sans-serif] text-3xl font-bold mb-3">Соберём подборку под ваш продукт</h2>
              <p className="text-white/60 mb-4">Опишите, что вы продаёте и в каких регионах. Пришлём первые 50 компаний с контактами и откроем пробный доступ.</p>
              <ul className="space-y-2 text-sm text-white/70">
                {["Источник — открытые реестры ФНС", "Обновление каждый месяц", "Данные можно выгрузить в свою CRM"].map(t => (
                  <li key={t} className="flex gap-2"><Icon name="Check" size={16} className="text-emerald-300 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
            <RadarAccessForm plan="Подборка" filters={filtersLabel} />
          </section>

          <p className="text-xs text-white/35 leading-relaxed">
            Источник: реестр получателей поддержки субъектов МСП и единый реестр субъектов МСП (ФНС России), открытые данные.
            Получение господдержки — повод для контакта, а не гарантия потребности компании в ваших услугах.
          </p>
        </div>
      </div>

      {plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPlan(null)} />
          <div className="relative w-full max-w-lg bg-[#10101c] border border-white/10 rounded-2xl p-6">
            <button onClick={() => setPlan(null)} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
            <RadarAccessForm plan={plan} filters={filtersLabel} title={`Тариф «${plan}»: пробный доступ`} onClose={() => setPlan(null)} />
          </div>
        </div>
      )}
    </>
  );
}
