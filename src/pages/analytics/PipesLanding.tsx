import { useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";
import { FaqSchema, ServiceSchema } from "@/components/biz/SeoSchema";
import PipesLeadForm from "@/components/pipes/PipesLeadForm";
import { KINDS } from "@/components/pipes/kinds";

const PAINS = [
  ["Clock", "Пятничная сводка", "Аналитик полдня выгружает из CRM, 1С и Метрики, склеивает в Excel и сверяет — каждую неделю заново"],
  ["Copy", "Дубли и мусор", "Один клиент три раза, суммы текстом, даты в пяти форматах, время по Москве и UTC вперемешку"],
  ["EyeOff", "Тихие поломки", "Выгрузка сломалась две недели назад, а заметили, только когда цифры на совещании не сошлись"],
];

const STEPS = [
  ["Plug", "Подключите источник", "Ссылка на Google Таблицу, токен amoCRM, вебхук Битрикс24 или адрес 1С — мастер подскажет, где что взять"],
  ["Wand2", "Настройте очистку", "Дубли, пустые строки, «1 200,50 ₽» → число, даты к одному формату, часовой пояс — видно на живой пробе данных"],
  ["CalendarClock", "Поставьте расписание", "Раз в сутки, каждые 6 часов или каждый час. Ошибка — письмо на почту и автоматический повтор"],
  ["LayoutDashboard", "Смотрите отчёты", "Одна кнопка — дашборд в облачном BI. Или постоянная ссылка CSV для Excel, DataLens, Power BI"],
];

const CASES = [
  { icon: "ShoppingCart", title: "Торговля и e-commerce", src: "МойСклад · 1С · Метрика · сайт", text: "Отгрузки, остатки и заказы в одной таблице каждое утро. Видно, какой товар заканчивается и какой канал приносит выручку, а не только клики." },
  { icon: "GraduationCap", title: "Онлайн-школы и сервисы", src: "amoCRM / Битрикс24 · Метрика · Google Таблицы", text: "Заявки, оплаты и UTM-метки сведены вместе: стоимость ученика по каналам, конверсия менеджеров, повторные покупки." },
  { icon: "Wheat", title: "Агро и закупки", src: "1С · Google Таблицы · файлы поставщиков", text: "Закупки, цены поставщиков и остатки на элеваторах из разных файлов — в единой витрине с историей по дням." },
  { icon: "Factory", title: "Производство", src: "1С:УПП / ERP · PostgreSQL · Excel", text: "План-факт выпуска, брак, загрузка оборудования и себестоимость — без ручной сборки отчёта к планёрке." },
  { icon: "Briefcase", title: "Услуги и малый бизнес", src: "CRM · таблицы · онлайн-запись", text: "Выручка, средний чек, загрузка мастеров и возвращаемость клиентов — дашборд для собственника на телефоне." },
];

const PLANS = [
  { name: "Старт", price: "0 ₽", unit: "навсегда", items: ["2 источника", "до 10 000 строк в каждом", "Обновление раз в сутки или неделю", "Очистка и история загрузок", "Облачный BI и выгрузка CSV"], cta: "Начать бесплатно", href: "/analytics/pipes/app" },
  { name: "Бизнес", price: "4 900 ₽", unit: "в месяц", accent: true, items: ["15 источников", "до 200 000 строк в каждом", "Обновление каждый час", "Письма об ошибках и автоповтор", "Помощь с подключением 1С и CRM"], cta: "Подключить «Бизнес»" },
  { name: "Под ключ", price: "от 60 000 ₽", unit: "внедрение + от 15 000 ₽/мес", items: ["Wildberries, Ozon, Директ, GetCourse, iiko и свои API", "Объединение систем в одну витрину", "Хранилище данных на вашем сервере", "Дашборды для руководителя и отделов", "Сопровождение и SLA"], cta: "Обсудить внедрение" },
];

const COMPARE: [string, string, string, string][] = [
  ["Запуск", "10 минут, без программиста", "недели настройки инженером", "дни, но данные зарубежом"],
  ["1С, amoCRM, Битрикс24, МойСклад", "из коробки", "нужны доработки", "частично"],
  ["Очистка: дубли, числа, даты, пояса", "галочками на живой пробе", "пишется кодом", "отдельный инструмент"],
  ["Ошибки и автоповтор", "письмо + история загрузок", "настраивается отдельно", "есть"],
  ["Данные в России, оплата по счёту", "да", "зависит от хостинга", "нет"],
  ["Цена для малого бизнеса", "0 – 4 900 ₽/мес", "сервер + инженер", "от $100/мес"],
];

const FAQ: [string, string][] = [
  ["Это безопасно? Вы видите мои пароли?", "Пароли и токены хранятся только в зашифрованном виде и не показываются даже в кабинете. Подключение к базам работает в режиме «только чтение», а в CRM мы используем доступ на чтение — изменить ваши данные невозможно."],
  ["Где хранятся загруженные данные?", "В облачном хранилище в России. Доступ — по длинной секретной ссылке, известной только вам. На тарифе «Под ключ» можем развернуть хранилище на вашем сервере."],
  ["Как подключить 1С?", "Через стандартный интерфейс OData, который есть в 1С:Предприятие 8.3: его включают в публикации базы на веб-сервере. Если база не опубликована в интернет — поможем на тарифе «Бизнес» или подключим через выгрузку файла по расписанию."],
  ["Что если источник сломался?", "Загрузка помечается ошибкой с понятной причиной («истёк токен», «таблица закрыта»), вам приходит письмо, мы автоматически повторяем попытку. В отчётах остаются данные последней успешной загрузки."],
  ["Можно смотреть данные в DataLens или Power BI?", "Да: у каждого источника есть постоянная ссылка на CSV со свежими данными. Её можно подключить в Excel («Данные → Из интернета»), Google Таблицы, Yandex DataLens или Power BI."],
  ["Чем отличается от Airbyte или Apache NiFi?", "Это мощные инструменты для инженеров данных: их нужно разворачивать и сопровождать. Конвейер делает то же для типичных задач малого и среднего бизнеса — без сервера и программиста, с российскими системами из коробки."],
];

export default function PipesLanding() {
  const [lead, setLead] = useState<string | null>(null);
  return (
    <BizShell title="Конвейер данных: автозагрузка из 1С, amoCRM, Битрикс24, МойСклад в BI | МАТ-Лабс"
      description="Подключите 1С, amoCRM, Битрикс24, МойСклад, Яндекс Метрику, Google Таблицы и базы данных: регулярная загрузка, очистка дублей и форматов, история ошибок и готовые дашборды. Бесплатный тариф."
      path="/analytics/pipes" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Конвейер данных" }]}>
      <ServiceSchema name="Конвейер данных МАТ-Лабс" description="Автоматическая загрузка и очистка данных из 1С, CRM, Метрики и таблиц в BI" url="https://mat-labs.ru/analytics/pipes" category="ETL-сервис" />
      <FaqSchema items={FAQ} />

      <header className="grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center mb-16">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/[0.04] px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-5"><Icon name="Workflow" size={14} />Конвейер данных · ETL без программиста</div>
          <h1 className="font-['Oswald',sans-serif] text-4xl md:text-6xl font-bold leading-[1.03] mb-5">
            Все данные компании <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">в одном месте</span> — сами, каждый день
          </h1>
          <p className="text-white/65 text-lg mb-7 max-w-xl">1С, amoCRM, Битрикс24, МойСклад, Метрика, Google Таблицы и ваши базы. Загружаем по расписанию, чистим дубли и форматы, предупреждаем об ошибках — и сразу показываем в дашбордах.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/analytics/pipes/app" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-7 py-4 rounded-2xl font-semibold text-white shadow-lg shadow-violet-600/30 flex items-center gap-2"><Icon name="Plug" size={18} />Подключить бесплатно</Link>
            <button onClick={() => setLead("Внедрение под ключ")} className="bg-white/[0.04] border border-white/20 px-7 py-4 rounded-2xl font-semibold text-white hover:bg-white/10 flex items-center gap-2">Внедрение под ключ<Icon name="ArrowRight" size={18} /></button>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-white/50">
            {["10 минут до первых данных", "Пароли зашифрованы", "Только чтение — данные не изменить"].map(t => <span key={t} className="flex items-center gap-1.5"><Icon name="Check" size={15} className="text-emerald-300" />{t}</span>)}
          </div>
        </div>
        <FlowVisual />
      </header>

      <section className="grid md:grid-cols-3 gap-4 mb-16">
        {PAINS.map(([i, t, d]) => (
          <div key={t} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/25 flex items-center justify-center mb-3"><Icon name={i} size={19} className="text-rose-300" /></div>
            <div className="font-semibold text-white mb-1">{t}</div><p className="text-sm text-white/55 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      <section className="mb-16">
        <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold mb-2">Как это работает</h2>
        <p className="text-white/55 mb-6">Четыре шага в мастере — без технического задания и созвонов.</p>
        <div className="grid md:grid-cols-4 gap-4">
          {STEPS.map(([i, t, d], n) => (
            <div key={t} className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"><Icon name={i} size={20} /></div>
                <span className="font-['Oswald',sans-serif] text-3xl text-white/15 font-bold">0{n + 1}</span>
              </div>
              <div className="font-semibold text-white mb-1">{t}</div><p className="text-sm text-white/55 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold">{KINDS.length} готовых коннекторов</h2>
          <button onClick={() => setLead("Нестандартный источник")} className="text-sm text-violet-300 hover:text-white flex items-center gap-1">Нужен другой источник?<Icon name="ArrowRight" size={14} /></button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {KINDS.map(k => (
            <div key={k.kind} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center mb-3`}><Icon name={k.icon} size={19} /></div>
              <div className="font-semibold text-white text-sm">{k.title}</div>
              <div className="text-xs text-white/45 mt-1 leading-snug">{k.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-3">Под ключ: Wildberries, Ozon, Яндекс Директ, VK Реклама, GetCourse, iiko, r_keeper, Тильда, YCLIENTS и любые системы с API.</p>
      </section>

      <section className="mb-16">
        <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold mb-6">Что получает ваша отрасль</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CASES.map(c => (
            <div key={c.title} className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center"><Icon name={c.icon} size={19} className="text-violet-200" /></div>
                <div className="font-semibold text-white">{c.title}</div>
              </div>
              <div className="text-xs text-cyan-300/90 mb-2">{c.src}</div>
              <p className="text-sm text-white/60 leading-relaxed">{c.text}</p>
            </div>
          ))}
          <button onClick={() => setLead("Сценарий для моей отрасли")} className="rounded-2xl border-2 border-dashed border-violet-500/40 p-5 text-left hover:bg-violet-500/10 transition-colors">
            <Icon name="Sparkles" size={22} className="text-violet-300 mb-3" />
            <div className="font-semibold text-white mb-1">Другая отрасль?</div>
            <p className="text-sm text-white/55">Опишите свои системы — пришлём схему подключения и пример дашборда за один день.</p>
          </button>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold mb-6">Сравнение</h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead><tr className="text-left border-b border-white/10">
              <th className="p-4 font-normal text-white/45"></th>
              <th className="p-4 font-semibold text-white bg-violet-500/10">Конвейер МАТ-Лабс</th>
              <th className="p-4 font-normal text-white/55">Airbyte, NiFi на своём сервере</th>
              <th className="p-4 font-normal text-white/55">Зарубежные облачные ETL</th>
            </tr></thead>
            <tbody>{COMPARE.map(([l, a, b, c]) => (
              <tr key={l} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-white/70">{l}</td><td className="p-4 text-cyan-200 bg-violet-500/[0.06]">{a}</td><td className="p-4 text-white/50">{b}</td><td className="p-4 text-white/50">{c}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section id="plans" className="mb-16 scroll-mt-6">
        <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold mb-6">Тарифы</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-3xl p-6 flex flex-col ${p.accent ? "bg-gradient-to-b from-violet-600/30 to-cyan-600/10 border-2 border-violet-400/60 shadow-[0_0_60px_-15px_rgba(139,92,246,.6)]" : "bg-white/[0.03] border border-white/10"}`}>
              {p.accent && <div className="text-[11px] uppercase tracking-wider text-violet-200 mb-2">Для растущего бизнеса</div>}
              <div className="text-lg font-semibold text-white">{p.name}</div>
              <div className="font-['Oswald',sans-serif] text-4xl font-bold text-white mt-2">{p.price}</div>
              <div className="text-xs text-white/45 mb-5">{p.unit}</div>
              <ul className="space-y-2.5 flex-1 mb-6">{p.items.map(i => <li key={i} className="flex gap-2 text-sm text-white/75"><Icon name="Check" size={16} className="text-emerald-300 shrink-0 mt-0.5" />{i}</li>)}</ul>
              {p.href
                ? <Link to={p.href} className="w-full py-3 rounded-xl text-sm font-semibold text-center border border-white/15 text-white hover:bg-white/5">{p.cta}</Link>
                : <button onClick={() => setLead(p.name)} className={`w-full py-3 rounded-xl text-sm font-semibold ${p.accent ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white" : "bg-white text-[#10101c]"}`}>{p.cta}</button>}
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-3">Оплата по счёту для юрлиц и ИП.</p>
      </section>

      <Card title="Частые вопросы" icon="HelpCircle" className="mb-10">
        <div className="divide-y divide-white/5">
          {FAQ.map(([q, a]) => (
            <details key={q} className="py-3 group">
              <summary className="cursor-pointer text-white font-medium list-none flex justify-between gap-3">{q}<Icon name="ChevronDown" size={16} className="text-white/40 group-open:rotate-180 transition-transform shrink-0" /></summary>
              <p className="text-sm text-white/60 mt-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </Card>

      <section className="bg-gradient-to-br from-violet-600/25 to-cyan-600/10 border border-violet-500/40 rounded-3xl p-6 md:p-10 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold mb-3">Первые данные — через 10 минут</h2>
          <p className="text-white/65 mb-6">Начните с Google Таблицы или CRM бесплатно. Если систем много или нужна единая витрина — подключим под ключ за 10 рабочих дней.</p>
          <Link to="/analytics/pipes/app" className="inline-flex bg-white text-[#10101c] hover:bg-violet-100 px-7 py-4 rounded-2xl font-semibold items-center gap-2">Открыть кабинет<Icon name="ArrowRight" size={18} /></Link>
        </div>
        <div className="bg-[#10101c]/80 border border-white/10 rounded-2xl p-5"><PipesLeadForm plan="Внедрение под ключ" title="Обсудить внедрение" /></div>
      </section>

      {lead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLead(null)} />
          <div className="relative w-full max-w-lg bg-[#10101c] border border-white/10 rounded-2xl p-6">
            <button onClick={() => setLead(null)} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
            <PipesLeadForm plan={lead} onDone={() => setLead(null)} />
          </div>
        </div>
      )}
    </BizShell>
  );
}

function FlowVisual() {
  const left = KINDS.filter(k => ["onec", "amocrm", "bitrix24", "moysklad", "metrika", "google_sheets"].includes(k.kind));
  return (
    <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-5 md:p-6">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="space-y-2">
          {left.map(k => (
            <div key={k.kind} className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-2">
              <div className={`w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon name={k.icon} size={14} /></div>
              <span className="text-xs text-white/80 truncate">{k.title}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon name="ChevronRight" size={18} className="text-violet-300/60" />
          <div className="w-20 md:w-24 rounded-2xl bg-gradient-to-b from-violet-600 to-cyan-600 p-3 text-center shadow-[0_0_40px_-5px_rgba(124,58,237,.7)]">
            <Icon name="Workflow" size={24} className="mx-auto mb-1" />
            <div className="text-[10px] font-semibold leading-tight">очистка<br />расписание<br />контроль</div>
          </div>
          <Icon name="ChevronRight" size={18} className="text-cyan-300/60" />
        </div>
        <div className="space-y-2">
          {[["LayoutDashboard", "Облачный BI", "дашборды"], ["FileSpreadsheet", "Excel и CSV", "постоянная ссылка"], ["BarChart3", "DataLens, Power BI", "подключение по URL"], ["Bell", "Письмо об ошибке", "автоповтор"]].map(([i, t, s]) => (
            <div key={t} className="bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-xs text-white"><Icon name={i} size={13} className="text-cyan-300" />{t}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{s}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 text-center">
        {[["10 мин", "до первых данных"], ["авто", "очистка дублей и форматов"], ["24/7", "контроль загрузок"]].map(([v, l]) => (
          <div key={l}><div className="font-['Oswald',sans-serif] text-xl font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">{v}</div><div className="text-[10px] text-white/45 leading-tight">{l}</div></div>
        ))}
      </div>
    </div>
  );
}
