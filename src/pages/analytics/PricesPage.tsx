import { useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import BizOrderModal from "@/components/biz/BizOrderModal";
import { Card } from "@/components/biz/BizUi";
import { FaqSchema } from "@/components/biz/SeoSchema";
import { PRO_INCLUDES } from "@/components/biz/UnlockModal";
import { CORP_INCLUDES } from "@/pages/analytics/AccountPage";
import { PRICES } from "@/components/biz/bizApi";

type Order = { type: "pro" | "corp" | "market" | "custom" | "database"; title: string; price?: number; includes?: string[] };

const PLANS = [
  {
    id: "free", name: "Бесплатно", price: "0 ₽", unit: "навсегда", tag: "Без карты",
    items: ["Проверка контрагентов — без ограничений и без регистрации", "3 полных отчёта о компаниях", "Первый отчёт о рынке в подарок", "Слежение за 3 контрагентами", "Облачный BI и Конвейер данных «Старт»"],
    cta: "Начать бесплатно", href: "/analytics/account",
  },
  {
    id: "pro", name: "Аналитика Про", price: `${PRICES.pro.toLocaleString("ru-RU")} ₽`, unit: "в месяц", tag: "Дешевле Контур.Фокуса", accent: true,
    items: PRO_INCLUDES.concat(["Всё из бесплатного тарифа"]),
    cta: "Подключить",
  },
  {
    id: "corp", name: "Отдел продаж", price: `${PRICES.corp.toLocaleString("ru-RU")} ₽`, unit: "в месяц · комплекс", tag: "Экономия 2 890 ₽/мес",
    items: CORP_INCLUDES,
    cta: "Подключить комплекс",
  },
];

const ONE_OFF: { icon: string; name: string; price: string; text: string; order: Order }[] = [
  { icon: "PieChart", name: "Отчёт о рынке с Excel", price: "4 900 ₽", text: "Все компании сегмента в Excel для CRM и выводы аналитика: где точки входа и кого брать в партнёры", order: { type: "market", title: "Отчёт о рынке с Excel и выводами аналитика", price: 4900 } },
  { icon: "Database", name: "База компаний под задачу", price: "от 2 900 ₽", text: "Выгрузка по отраслям, регионам, выручке и штату — с контактами, для холодных продаж", order: { type: "database", title: "База компаний под задачу" } },
  { icon: "ShieldAlert", name: "Заключение для службы безопасности", price: "от 3 900 ₽", text: "Учредители, связи, суды, исполнительные производства, вывод аналитика — PDF с подписью", order: { type: "custom", title: "Заключение для службы безопасности" } },
  { icon: "Microscope", name: "Исследование под задачу", price: `от ${PRICES.research.toLocaleString("ru-RU")} ₽`, text: "Вход на рынок, ёмкость, конкуренты, поставщики — с созвоном и презентацией за 3–7 дней. В агентствах — от 60 000 ₽", order: { type: "custom", title: "Исследование под задачу" } },
];

const COMPARE: [string, string, string, string][] = [
  ["Проверка контрагента, индекс риска", "бесплатно", "бесплатно клиентам банка", "в подписке"],
  ["Слежение за контрагентами", "3 бесплатно, 30 в Про", "только клиентам банка", "в подписке"],
  ["Объём рынка, доли лидеров по региону", "да", "нет", "нет"],
  ["Рейтинги топ-100 по любой отрасли", "в Про", "нет", "частично"],
  ["Свои данные из 1С и CRM в дашбордах", "Конвейер данных", "нет", "нет"],
  ["Стоимость в месяц", "0 – 2 990 ₽", "0 ₽, но нужен счёт в банке", "от 3 990 ₽"],
];

const FAQ: [string, string][] = [
  ["Почему проверка бесплатная?", "Базовую проверку контрагентов сегодня бесплатно дают банки и сама налоговая — брать за неё деньги было бы нечестно. Наша ценность — в аналитике рынков, рейтингах, слежении и работе с вашими данными."],
  ["Что значит «первый отчёт о рынке в подарок»?", "После входа по email вы открываете полный отчёт о любом одном рынке: топ-50 компаний с ИНН, долями и штатом. Следующие — в подписке «Аналитика Про» (3 в месяц) или разово."],
  ["Откуда данные?", "Открытые данные ФНС России за 2025 год: доходы и расходы, численность, налоговые режимы, недоимки, реестр МСП. Статус и руководитель — из ЕГРЮЛ на момент запроса. Господдержка — реестр получателей поддержки."],
  ["Как работает слежение?", "Каждый день сверяем статус, руководителя, адрес, налоговые долги и индекс риска. Если что-то изменилось — присылаем одно письмо со всеми изменениями."],
  ["Как оплатить подписку?", "По счёту для юрлиц и ИП. Оставьте заявку — пришлём счёт в течение рабочего дня и включим доступ на ваш email сразу после оплаты. Можно оплатить сразу на 3, 6 или 12 месяцев."],
  ["Чем отличается от СПАРК или Контур.Фокуса?", "Мы делаем упор на рынки: объём отрасли в регионе, доли лидеров, концентрацию, приток новых игроков. Для глубокой юридической проверки — суды, залоги, аффилированность — готовим заключение для службы безопасности по запросу."],
];

export default function PricesPage() {
  const [order, setOrder] = useState<Order | null>(null);
  return (
    <BizShell title="Тарифы бизнес-аналитики: проверка контрагентов бесплатно, подписка от 2 990 ₽ | МАТ-Лабс"
      description="Проверка контрагентов бесплатно и без регистрации. 3 отчёта о компаниях и первый отчёт о рынке в подарок. Подписка «Аналитика Про» — 2 990 ₽/мес, комплекс «Отдел продаж» — 9 900 ₽/мес."
      path="/analytics/prices" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Тарифы" }]}>
      <FaqSchema items={FAQ} />
      <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold mb-3">Тарифы</h1>
      <p className="text-white/60 mb-8 max-w-3xl">Проверка контрагентов — бесплатно для всех. Платите только за то, чего нет в банках: аналитику рынков, рейтинги, слежение и работу с вашими данными.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {PLANS.map(p => (
          <div key={p.id} className={`rounded-3xl p-6 flex flex-col ${p.accent ? "bg-gradient-to-b from-violet-600/30 to-cyan-600/10 border-2 border-violet-400/60 shadow-[0_0_60px_-15px_rgba(139,92,246,.6)]" : "bg-white/[0.03] border border-white/10"}`}>
            <div className={`text-[11px] uppercase tracking-wider mb-2 ${p.accent ? "text-violet-200" : "text-emerald-300/80"}`}>{p.tag}</div>
            <div className="text-lg font-semibold text-white">{p.name}</div>
            <div className="font-['Oswald',sans-serif] text-4xl font-bold text-white mt-2">{p.price}</div>
            <div className="text-xs text-white/45 mb-5">{p.unit}</div>
            <ul className="space-y-2.5 flex-1 mb-6">{p.items.map(i => <li key={i} className="flex gap-2 text-sm text-white/75"><Icon name="Check" size={16} className="text-emerald-300 shrink-0 mt-0.5" />{i}</li>)}</ul>
            {p.href
              ? <Link to={p.href} className="w-full py-3 rounded-xl text-sm font-semibold text-center border border-white/15 text-white hover:bg-white/5">{p.cta}</Link>
              : <button onClick={() => setOrder({ type: p.id as "pro" | "corp", title: `${p.id === "pro" ? "Подписка «Аналитика Про»" : "Комплекс «Отдел продаж»"} — 1 месяц`, price: p.id === "pro" ? PRICES.pro : PRICES.corp, includes: p.items })}
                  className={`w-full py-3 rounded-xl text-sm font-semibold ${p.accent ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white" : "bg-white text-[#10101c]"}`}>{p.cta}</button>}
          </div>
        ))}
      </div>

      <h2 className="font-['Oswald',sans-serif] text-2xl md:text-3xl font-bold mb-4">Разово, без подписки</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {ONE_OFF.map(o => (
          <button key={o.name} onClick={() => setOrder(o.order)} className="text-left bg-white/[0.03] border border-white/10 hover:border-violet-500/40 rounded-2xl p-5 flex flex-col">
            <Icon name={o.icon} size={22} className="text-violet-300 mb-3" />
            <div className="font-semibold text-white">{o.name}</div>
            <div className="font-['Oswald',sans-serif] text-2xl font-bold text-white mt-1">{o.price}</div>
            <p className="text-xs text-white/55 mt-2 leading-relaxed flex-1">{o.text}</p>
            <span className="text-sm text-violet-300 mt-3 flex items-center gap-1">Заказать<Icon name="ArrowRight" size={14} /></span>
          </button>
        ))}
      </div>

      <h2 className="font-['Oswald',sans-serif] text-2xl md:text-3xl font-bold mb-4">Сравнение</h2>
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto mb-10">
        <table className="w-full text-sm min-w-[680px]">
          <thead><tr className="text-left border-b border-white/10">
            <th className="p-4 font-normal text-white/45"></th>
            <th className="p-4 font-semibold text-white bg-violet-500/10">МАТ-Лабс</th>
            <th className="p-4 font-normal text-white/55">Сервисы банков</th>
            <th className="p-4 font-normal text-white/55">Контур.Фокус, СПАРК</th>
          </tr></thead>
          <tbody>{COMPARE.map(([l, a, b, c]) => (
            <tr key={l} className="border-b border-white/5 last:border-0">
              <td className="p-4 text-white/70">{l}</td><td className="p-4 text-cyan-200 bg-violet-500/[0.06]">{a}</td><td className="p-4 text-white/50">{b}</td><td className="p-4 text-white/50">{c}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <Card title="Частые вопросы" icon="HelpCircle">
        <div className="divide-y divide-white/5">
          {FAQ.map(([q, a]) => (
            <details key={q} className="py-3 group">
              <summary className="cursor-pointer text-white font-medium list-none flex justify-between gap-3">{q}<Icon name="ChevronDown" size={16} className="text-white/40 group-open:rotate-180 transition-transform shrink-0" /></summary>
              <p className="text-sm text-white/60 mt-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </Card>
      {order && <BizOrderModal reportType={order.type} title={order.title} price={order.price} includes={order.includes} onClose={() => setOrder(null)} />}
    </BizShell>
  );
}
