import { useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";
import BizOrderModal from "@/components/biz/BizOrderModal";
import { FaqSchema, ItemListSchema } from "@/components/biz/SeoSchema";
import { GROUPS, SERVICES, STEPS_COMMON, rub } from "@/components/biz/servicesData";

const WHY: [string, string, string][] = [
  ["BadgeRussianRuble", "Цена на сайте", "У агентств и интеграторов — «стоимость по запросу». У нас калькулятор и фиксированная цена в договоре"],
  ["Database", "Свои данные о 2,16 млн компаний", "Выручка, штат, налоги, господдержка и контакты уже в базе — исследование начинается не с нуля"],
  ["Zap", "Сроки от 1 дня", "Обогащение базы — за день, кабинетное исследование — от 5 дней, дашборд — от 10"],
  ["Layers", "Исследование, данные и BI в одном месте", "Не нужно нанимать агентство, парсинг-студию и BI-интегратора по отдельности"],
];

const FAQ: [string, string][] = [
  ["Сколько стоит исследование рынка под ключ?", "Кабинетное исследование — от 45 000 ₽ и 5 рабочих дней, опрос — от 60 000 ₽, глубинные интервью — от 70 000 ₽. Точную цену покажет калькулятор на странице услуги."],
  ["Сколько стоит дашборд для бизнеса?", "Один дашборд до 10 графиков с подключением таблиц или CRM — от 60 000 ₽ за 10 рабочих дней. Система из 6+ дашбордов с 1С и хранилищем — от 280 000 ₽."],
  ["Сколько стоит парсинг сайтов конкурентов?", "Разовый сбор с 1–2 сайтов — от 15 000 ₽ за 3 дня. Мониторинг маркетплейсов с ежедневным обновлением — от 100 000 ₽ за 3 месяца."],
  ["Работаете по договору с юрлицами?", "Да: договор, акт, счёт. Работаем с компаниями и ИП по всей России, удалённо."],
  ["Можно попробовать бесплатно?", "Да: бесплатные отчёты о рынках, справочник баз компаний и облачный BI для своих таблиц доступны без регистрации."],
];

export default function ServicesPage() {
  const [brief, setBrief] = useState(false);
  const groups = Object.keys(GROUPS) as (keyof typeof GROUPS)[];

  return (
    <BizShell title="Аналитика под ключ: исследования рынка, парсинг, дашборды — цены и сроки | МАТ-Лабс"
      description="Исследование рынка от 45 000 ₽, опросы и интервью, тайный покупатель, парсинг сайтов и маркетплейсов, обогащение базы клиентов, BI-дашборды и хранилище данных под ключ. Цены и сроки на сайте, калькулятор."
      path="/analytics/services" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Услуги под ключ" }]}>
      <ItemListSchema name="Услуги аналитики под ключ" items={SERVICES.map(s => ({ name: s.title, url: `https://mat-labs.ru/analytics/services/${s.slug}` }))} />
      <FaqSchema items={FAQ} />

      <header className="mb-10 grid lg:grid-cols-[1fr_auto] gap-6 items-end">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/[0.04] px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-5">
            <Icon name="Handshake" size={14} />Исследования · Данные · BI
          </div>
          <h1 className="font-['Oswald',sans-serif] text-4xl md:text-5xl font-bold leading-[1.05] mb-4">Аналитика под ключ — <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">с ценой на сайте</span></h1>
          <p className="text-white/60 text-lg max-w-3xl">Изучим рынок и клиентов, соберём данные с сайтов и маркетплейсов, обогатим вашу базу и построим дашборды. Один подрядчик вместо агентства, парсинг-студии и BI-интегратора.</p>
        </div>
        <button onClick={() => setBrief(true)} className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-7 py-4 rounded-2xl font-semibold text-white flex items-center gap-2 shadow-lg shadow-violet-600/30 whitespace-nowrap">
          <Icon name="FileText" size={18} />Заполнить бриф
        </button>
      </header>

      {groups.map(g => (
        <section key={g} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center"><Icon name={GROUPS[g].icon} fallback="Layers" size={20} className="text-violet-300" /></div>
            <div><h2 className="font-['Oswald',sans-serif] text-2xl font-bold">{GROUPS[g].title}</h2><p className="text-sm text-white/50">{GROUPS[g].text}</p></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.filter(s => s.group === g).map(s => (
              <Link key={s.slug} to={`/analytics/services/${s.slug}`} className="group bg-white/[0.03] border border-white/10 hover:border-violet-500/50 rounded-2xl p-5 flex flex-col transition-colors">
                <Icon name={s.icon} fallback="Sparkles" size={22} className="text-violet-300 mb-3" />
                <h3 className="font-semibold text-white leading-snug mb-1.5">{s.title}</h3>
                <p className="text-sm text-white/55 flex-1 mb-4">{s.short}</p>
                <div className="flex items-end justify-between">
                  <div><div className="text-white font-semibold">от {rub(s.priceFrom)}</div><div className="text-xs text-white/45">{s.daysFrom}–{s.daysTo} раб. дней</div></div>
                  <Icon name="ArrowRight" size={16} className="text-violet-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {WHY.map(([i, h, t]) => (
          <Card key={h}><Icon name={i} fallback="Check" size={20} className="text-cyan-300 mb-2" /><div className="font-semibold text-white mb-1">{h}</div><p className="text-sm text-white/55">{t}</p></Card>
        ))}
      </section>

      <Card title="Как работаем" icon="Route" className="mb-10">
        <ol className="grid md:grid-cols-5 gap-4">
          {STEPS_COMMON.map(([h, t], i) => (
            <li key={h}><div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-200 font-bold flex items-center justify-center mb-2">{i + 1}</div><div className="text-white font-medium">{h}</div><p className="text-sm text-white/55 mt-1">{t}</p></li>
          ))}
        </ol>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5 mb-10">
        <Card title="Попробуйте бесплатно" icon="Gift">
          <div className="space-y-2">
            {[["/analytics/bi", "Облачный BI: загрузите Excel и получите дашборд", "LayoutDashboard"], ["/analytics/market", "Отчёты о 88 рынках России", "PieChart"], ["/analytics/databases", "Справочник баз компаний с анализом", "Database"]].map(([to, l, i]) => (
              <Link key={to} to={to} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-sm text-white"><Icon name={i} size={17} className="text-violet-300" />{l}<Icon name="ArrowRight" size={14} className="ml-auto text-white/40" /></Link>
            ))}
          </div>
        </Card>
        <Card title="Частые вопросы" icon="HelpCircle">
          <div className="divide-y divide-white/5">
            {FAQ.map(([q, a]) => (
              <details key={q} className="py-2.5 group">
                <summary className="cursor-pointer text-white text-sm font-medium list-none flex justify-between gap-3">{q}<Icon name="ChevronDown" size={15} className="text-white/40 group-open:rotate-180 transition-transform shrink-0" /></summary>
                <p className="text-sm text-white/60 mt-2">{a}</p>
              </details>
            ))}
          </div>
        </Card>
      </div>

      {brief && <BizOrderModal reportType="service" reportKey="brief" title="Бриф: аналитика под ключ" onClose={() => setBrief(false)}
        includes={["Ответим в течение рабочего дня", "Предложим формат, цену и срок", "Фиксированная стоимость в договоре"]} />}
    </BizShell>
  );
}
