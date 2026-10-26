import { useState } from "react";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import BizOrderModal from "@/components/biz/BizOrderModal";
import { Card } from "@/components/biz/BizUi";

type T = "market" | "company" | "check" | "custom";

const PLANS: { type: T; name: string; price: string; priceNum?: number; unit: string; items: string[]; accent?: boolean }[] = [
  { type: "check", name: "Проверка контрагента", price: "490 ₽", priceNum: 490, unit: "за компанию", items: ["Индекс риска 0–100 с расшифровкой", "Статус ЕГРЮЛ, долги, убыточность", "PDF для СБ и бухгалтерии"] },
  { type: "company", name: "Отчёт о компании", price: "1 490 ₽", priceNum: 1490, unit: "за компанию", items: ["Всё из проверки", "Финансы против отрасли и региона", "Конкуренты с ИНН, контакты"] },
  { type: "market", name: "Отчёт о рынке", price: "4 900 ₽", priceNum: 4900, unit: "отрасль × регион", accent: true, items: ["Объём, сегменты, география", "Топ-50 игроков с ИНН и долями", "Excel со всеми компаниями сегмента", "Выводы аналитика"] },
  { type: "custom", name: "Исследование под задачу", price: "от 25 000 ₽", unit: "срок 3–7 дней", items: ["Вход на рынок, поиск поставщиков и партнёров", "Выборки по нескольким регионам и ОКВЭД", "Созвон с аналитиком и презентация"] },
];

const PACKS = [
  ["10 проверок контрагентов", "3 900 ₽", "390 ₽ за проверку"],
  ["5 отчётов о рынках", "19 900 ₽", "3 980 ₽ за отчёт"],
  ["Безлимит на год для отдела продаж", "149 000 ₽", "отчёты, рейтинги, Радар"],
];

const FAQ = [
  ["Откуда данные?", "Открытые данные ФНС России: доходы и расходы по бухгалтерской отчётности за 2025 год, среднесписочная численность, налоговые режимы, недоимки, единый реестр МСП. Статус и руководитель — из ЕГРЮЛ на момент запроса. Господдержка — реестр получателей поддержки."],
  ["Чем отличается от СПАРК или Контур.Фокуса?", "Мы делаем упор на рынки: объём отрасли в регионе, доли лидеров, концентрацию, приток новых игроков — и продаём разовые отчёты без годовой подписки. Для глубокой юридической проверки (суды, залоги, связи) пока рекомендуем специализированные сервисы."],
  ["Почему у некоторых компаний нет выручки?", "Небольшие компании на упрощёнке могут не сдавать бухотчётность в ФНС, а часть сведений закрыта по закону. Такие компании учитываются в числе игроков, но не в объёме рынка."],
  ["Как быстро придёт отчёт?", "В течение рабочего дня после оплаты счёта — PDF и Excel на почту. Исследование под задачу — 3–7 дней."],
];

export default function PricesPage() {
  const [order, setOrder] = useState<{ type: T; title: string; price?: number } | null>(null);
  return (
    <BizShell title="Тарифы на отчёты о рынках, компаниях и проверку контрагентов | МАТ-Лабс"
      description="Разовые отчёты без подписки: проверка контрагента 490 ₽, отчёт о компании 1 490 ₽, отчёт о рынке 4 900 ₽. Пакеты и годовой доступ для отдела продаж."
      path="/analytics/prices" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Тарифы" }]}>
      <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold mb-3">Тарифы</h1>
      <p className="text-white/60 mb-8 max-w-3xl">Платите за конкретный отчёт — без годовых подписок. Превью любого отчёта бесплатно, полный — по счёту для юрлиц и ИП.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLANS.map(p => (
          <div key={p.name} className={`rounded-2xl p-5 flex flex-col ${p.accent ? "bg-gradient-to-b from-violet-600/25 to-violet-600/5 border border-violet-500/50" : "bg-white/[0.03] border border-white/10"}`}>
            {p.accent && <div className="text-[11px] uppercase tracking-wider text-violet-200 mb-2">Самый популярный</div>}
            <div className="font-semibold text-white">{p.name}</div>
            <div className="font-['Oswald',sans-serif] text-3xl font-bold text-white mt-2">{p.price}</div>
            <div className="text-xs text-white/45 mb-4">{p.unit}</div>
            <ul className="space-y-2 flex-1 mb-5">{p.items.map(i => <li key={i} className="flex gap-2 text-sm text-white/75"><Icon name="Check" size={15} className="text-emerald-300 shrink-0 mt-0.5" />{i}</li>)}</ul>
            <button onClick={() => setOrder({ type: p.type, title: p.name, price: p.priceNum })}
              className={`w-full py-3 rounded-xl text-sm font-semibold ${p.accent ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white" : "border border-white/15 text-white hover:bg-white/5"}`}>Заказать</button>
          </div>
        ))}
      </div>
      <Card title="Пакеты" icon="Package" className="mb-8">
        <div className="grid md:grid-cols-3 gap-3">
          {PACKS.map(([n, p, s]) => (
            <button key={n} onClick={() => setOrder({ type: "custom", title: `Пакет: ${n}` })} className="text-left bg-white/[0.03] border border-white/10 hover:border-violet-500/40 rounded-xl p-4">
              <div className="text-white font-medium">{n}</div>
              <div className="text-xl font-bold text-white mt-1">{p}</div>
              <div className="text-xs text-white/45">{s}</div>
            </button>
          ))}
        </div>
      </Card>
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
      {order && <BizOrderModal reportType={order.type} title={order.title} price={order.price} onClose={() => setOrder(null)} />}
    </BizShell>
  );
}
