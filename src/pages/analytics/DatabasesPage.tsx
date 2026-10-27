import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "@tanstack/react-router";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card, SourceNote } from "@/components/biz/BizUi";
import { ItemListSchema } from "@/components/biz/SeoSchema";
import { BizDatabase, bizGet, money, num, pct } from "@/components/biz/bizApi";

const TABS = [
  { id: "all", label: "Все базы" },
  { id: "industry", label: "По отраслям" },
  { id: "region", label: "По регионам" },
  { id: "segment", label: "Тематические" },
] as const;

const CAT_LABEL: Record<string, string> = { industry: "Отрасль", region: "Регион", segment: "Сегмент" };

export default function DatabasesPage() {
  const loaded = (useLoaderData({ strict: false }) as { items?: BizDatabase[] | null } | undefined)?.items ?? null;
  const [items, setItems] = useState<BizDatabase[]>(loaded || []);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(!loaded);

  useEffect(() => {
    if (loaded) return;
    bizGet<{ items: BizDatabase[] }>({ action: "databases" }).then(r => setItems(r.items || [])).finally(() => setLoading(false));
  }, [loaded]);

  const list = useMemo(() => items.filter(i =>
    (tab === "all" || i.category === tab) &&
    (!q.trim() || `${i.title} ${i.subtitle} ${i.description}`.toLowerCase().includes(q.trim().toLowerCase()))), [items, tab, q]);

  const total = items.reduce((a, i) => a + (i.category === "industry" ? Number(i.stats?.companies || 0) : 0), 0);

  return (
    <BizShell title="Базы компаний России по отраслям и регионам с аналитикой | МАТ-Лабс"
      description="Готовые базы компаний: строительство, оптовая и розничная торговля, производство, АПК, ИТ, логистика, регионы, крупный бизнес. Выручка 2025, штат, налоги, контакты. Анализ бесплатно, выгрузка в Excel."
      path="/analytics/databases" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Базы компаний" }]}>
      {items.length > 0 && <ItemListSchema name="Базы компаний России" items={items.map(i => ({ name: i.title, url: `https://mat-labs.ru/analytics/databases/${i.slug}` }))} />}
      <header className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold mb-3">Справочник баз компаний</h1>
          <p className="text-white/60 max-w-3xl">
            Готовые базы по отраслям, регионам и сегментам с бесплатным анализом: объём, структура, география, финансы и риски.
            Уточняйте любую базу фильтрами или соберите свою в конструкторе. Выгрузка в Excel с ИНН, выручкой и контактами — по заказу.
          </p>
        </div>
        <Link to="/analytics/databases/constructor" className="shrink-0 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-6 py-3.5 rounded-2xl font-semibold text-white flex items-center gap-2 shadow-lg shadow-violet-600/30">
          <Icon name="SlidersHorizontal" size={18} />Собрать свою базу
        </Link>
      </header>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-sm ${tab === t.id ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:text-white"}`}>
              {t.label}{t.id !== "all" && <span className="ml-1.5 text-white/40">{items.filter(i => i.category === t.id).length}</span>}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Найти базу"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60" />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />)}</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {list.map(d => (
            <Link key={d.slug} to={`/analytics/databases/${d.slug}`}
              className="group bg-white/[0.03] border border-white/10 hover:border-violet-500/50 rounded-2xl p-5 flex flex-col transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-violet-500/15 flex items-center justify-center"><Icon name={d.icon} fallback="Database" size={21} className="text-violet-300" /></div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-cyan-300/80">{CAT_LABEL[d.category]}</div>
                  <div className="font-semibold text-white leading-snug">{d.title}</div>
                  <div className="text-xs text-white/45">{d.subtitle}</div>
                </div>
              </div>
              <p className="text-sm text-white/55 leading-relaxed mb-4 flex-1">{d.description}</p>
              {d.stats && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white/[0.04] rounded-xl p-2.5"><div className="text-white font-semibold text-sm">{num(d.stats.companies)}</div><div className="text-[10px] text-white/45">компаний</div></div>
                  <div className="bg-white/[0.04] rounded-xl p-2.5"><div className="text-white font-semibold text-sm">{money(d.stats.revenue)}</div><div className="text-[10px] text-white/45">выручка</div></div>
                  <div className="bg-white/[0.04] rounded-xl p-2.5"><div className="text-emerald-300 font-semibold text-sm">{pct(d.stats.profitable, d.stats.with_revenue)}%</div><div className="text-[10px] text-white/45">прибыльных</div></div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Выгрузка от <b className="text-white">{d.price.toLocaleString("ru-RU")} ₽</b></span>
                <span className="text-sm text-violet-300 flex items-center gap-1 group-hover:gap-2 transition-all">Анализ<Icon name="ArrowRight" size={14} /></span>
              </div>
            </Link>
          ))}
          <Link to="/analytics/databases/constructor" className="border border-dashed border-violet-500/40 hover:bg-violet-500/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[220px]">
            <Icon name="Plus" size={28} className="text-violet-300 mb-2" />
            <div className="font-semibold text-white">Нужной базы нет?</div>
            <p className="text-sm text-white/55 mt-1">Соберите свою: любые коды ОКВЭД, регионы, выручка, штат, налоги</p>
          </Link>
        </div>
      )}

      <Card title="Что в каждой базе" icon="ListChecks" className="mb-5">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            ["Бесплатно", "Число компаний, выручка, медиана, структура по размеру, регионам и отраслям, доля прибыльных, долги, приток новых — и 10 первых компаний"],
            ["В выгрузке", "Все компании с ИНН, названием, городом, ОКВЭД, выручкой и расходами 2025, штатом, налоговым режимом, недоимкой"],
            ["Контакты", "Руководитель, сайт, телефон и почта — где найдены. Покрытие растёт каждую ночь"],
            ["Формат", "Excel с фильтрами + PDF-сводка с выводами. Обновление по новому выпуску данных ФНС"],
          ].map(([h, t]) => <div key={h}><div className="text-white font-medium mb-1">{h}</div><p className="text-white/55">{t}</p></div>)}
        </div>
      </Card>
      {total > 0 && <p className="text-xs text-white/40 mb-3">В отраслевых базах — {num(total)} компаний. Всего в системе — 2 160 938.</p>}
      <SourceNote />
    </BizShell>
  );
}