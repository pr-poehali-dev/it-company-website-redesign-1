import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";

type Mark = "yes" | "no" | "part";

const ROWS: { task: string; sber: string; sberMark: Mark; ours: string; oursMark: Mark; link?: string }[] = [
  { task: "Объём и структура рынка по отрасли и региону", sber: "Панель оптовой торговли и производства — по платежам 7 млн организаций", sberMark: "yes", ours: "Отчёт о рынке по выручке 2025 из отчётности ФНС, 88 отраслей × 89 регионов", oursMark: "yes", link: "/analytics/market" },
  { task: "Лидеры рынка и их доли", sber: "Топ-5 конкурентов по вашим товарам (по платежам)", sberMark: "yes", ours: "Топ-50 по выручке с ИНН, долей, прибылью, штатом", oursMark: "yes", link: "/analytics/rating" },
  { task: "Готовые базы компаний по отраслям и регионам", sber: "Подбор B2B-клиентов — список под заказ после консультации", sberMark: "part", ours: "26 готовых баз + конструктор с бесплатным анализом и выгрузкой в Excel", oursMark: "yes", link: "/analytics/databases" },
  { task: "Проверка контрагента", sber: "Сервис оценки благонадёжности, в составе панелей", sberMark: "yes", ours: "Индекс риска 0–100: ЕГРЮЛ, недоимки, убыточность, признаки транзитной компании", oursMark: "yes", link: "/analytics/company" },
  { task: "Рентабельность и бенчмарк против рынка", sber: "Аналитика рентабельности рынка — 9 млн компаний, 40+ источников, отчёт «уровня Большой четвёрки»", sberMark: "yes", ours: "Рентабельность компании против медианы отрасли в регионе, место в рейтинге", oursMark: "part", link: "/analytics/company" },
  { task: "Получатели господдержки как сигнал бюджета", sber: "Не заявлено", sberMark: "no", ours: "Радар: 18 тыс. получателей грантов и субсидий 2024–2026 с контактами", oursMark: "yes", link: "/radar" },
  { task: "Прозрачные цены и покупка без звонка", sber: "«Перезвоним и рассчитаем стоимость» — цен на сайте нет", sberMark: "no", ours: "Цены на сайте: от 490 ₽ за проверку, превью бесплатно", oursMark: "yes", link: "/analytics/prices" },
  { task: "Потребительские траты, средний чек, портрет покупателя", sber: "Транзакции 110 млн физлиц и 7,7 млн торговых точек, 70% безнала", sberMark: "yes", ours: "Нет — это банковские данные, их нет в открытом доступе", oursMark: "no" },
  { task: "Геоаналитика: трафик, локация, выручка точки", sber: "ГеоАналитика, «Портрет локации», «Торговый центр» — точность до 98%", sberMark: "yes", ours: "Нет", oursMark: "no" },
  { task: "Ежемесячная динамика продаж конкурентов", sber: "Обновление через 7–20 дней после конца месяца", sberMark: "yes", ours: "Только годовые данные ФНС; динамика год к году — со следующего выпуска", oursMark: "part" },
  { task: "Экспорт и импорт", sber: "Панель международной торговли, подбор зарубежных контрагентов", sberMark: "yes", ours: "Нет", oursMark: "no" },
  { task: "Туризм, миграция, экономика регионов для госсектора", sber: "Панели «Туризм», «Мониторинг экономики региона», 50+ регионов-клиентов", sberMark: "yes", ours: "Обзор регионов по выручке, числу компаний, новым игрокам", oursMark: "part", link: "/analytics" },
];

const SBER_PRODUCTS = [
  ["Панель оптовой торговли и производства", "Конкуренты, их доли и продажи вашим клиентам, регионы сбыта — по платежам 7 млн организаций, ежемесячно"],
  ["Подбор B2B-клиентов", "Список потенциальных покупателей и поставщиков по критериям заказчика, 200+ видов бизнеса, 4000+ видов продукции; обзвон лидов"],
  ["Аналитика рентабельности рынка", "Интервалы рыночной рентабельности для налогового контроля, 9 млн компаний, 40+ источников (ФНС, ЕГРЮЛ, закупки, ФАС)"],
  ["Проверка контрагента", "Благонадёжность и финансовое состояние партнёра"],
  ["Панель международной торговли", "Экспорт-импорт, поиск зарубежных поставщиков и покупателей"],
  ["ГеоАналитика и «Портрет локации»", "Подбор места для точки: трафик, средний чек по 47 отраслям, прогноз выручки на 12 месяцев"],
  ["Панели «Ритейл», «Ассортимент», «Торговый центр»", "Доля сети на рынке, перетоки покупателей, средний чек, тренды категорий"],
  ["Портрет клиента и «Портрет жителя»", "Пол, возраст, доход аудитории; сегментация"],
  ["Панели «Туризм» и «Мониторинг экономики региона»", "Турпоток, миграция, доходы населения, импортозависимость — для регионов"],
  ["Data Tracker", "Макроэкономика: 1 млн+ индикаторов, прогнозы по 400+ показателям, надстройка Excel и API"],
  ["Навигатор BI и «Среда Аналитика»", "BI-платформы для собственных дашбордов компании"],
  ["Количественные исследования", "Онлайн-опросы под задачу"],
];

const MARK: Record<Mark, [string, string]> = { yes: ["CheckCircle2", "text-emerald-300"], part: ["CircleDot", "text-amber-300"], no: ["MinusCircle", "text-white/25"] };

export default function CompetitorsPage() {
  return (
    <BizShell title="МАТ-Лабс или Сбер2В (СберАналитика): сравнение сервисов бизнес-аналитики"
      description="Чем бизнес-аналитика МАТ-Лабс отличается от Сбер2В и СберАналитики: продукты, данные, цены. Где выгоднее взять отчёт о рынке, базу компаний и проверку контрагента."
      path="/analytics/vs-sber" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Сравнение со Сбер2В" }]}>
      <header className="mb-8 max-w-4xl">
        <div className="text-sm text-violet-300 mb-2">Честное сравнение</div>
        <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold leading-tight mb-3">МАТ-Лабс и Сбер2В: что выбрать для анализа рынка</h1>
        <p className="text-white/60">
          Сбер2В (бывшая СберАналитика) строит продукты на обезличенных платежах клиентов банка — таких данных нет больше ни у кого. Мы работаем на открытых данных ФНС
          и продаём готовые отчёты и базы с ценой на сайте. Ниже — где сильнее они, а где выгоднее мы.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          ["Сбер2В", "Платежи 110 млн физлиц и 7 млн компаний, 7,7 млн торговых точек. Панели и исследования под заказ. Цены не публикуются — стоимость считают после консультации.", "Landmark"],
          ["МАТ-Лабс", "Отчётность 2,16 млн компаний за 2025 год, реестр МСП, ЕГРЮЛ, недоимки, господдержка. Превью бесплатно, отчёт от 490 ₽, база от 2 900 ₽.", "Radar"],
          ["Когда брать оба", "Наш отчёт — для быстрой оценки рынка и списка компаний. Сбер2В — когда нужны траты потребителей, трафик локации или ежемесячная динамика продаж.", "Scale"],
        ].map(([h, t, i]) => (
          <Card key={h}><Icon name={i} size={22} className="text-violet-300 mb-2" /><div className="font-semibold text-white mb-1">{h}</div><p className="text-sm text-white/60 leading-relaxed">{t}</p></Card>
        ))}
      </div>

      <Card title="Сравнение по задачам" icon="Table" className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-white/40 text-xs border-b border-white/10">
                <th className="py-2 pr-4 font-normal w-[26%]">Задача</th><th className="py-2 pr-4 font-normal w-[37%]">Сбер2В</th><th className="py-2 font-normal">МАТ-Лабс</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(r => (
                <tr key={r.task} className="border-b border-white/5 align-top">
                  <td className="py-3 pr-4 text-white font-medium">{r.task}</td>
                  <td className="py-3 pr-4 text-white/65"><span className="flex gap-2"><Icon name={MARK[r.sberMark][0]} size={16} className={`${MARK[r.sberMark][1]} shrink-0 mt-0.5`} />{r.sber}</span></td>
                  <td className="py-3 text-white/80">
                    <span className="flex gap-2"><Icon name={MARK[r.oursMark][0]} size={16} className={`${MARK[r.oursMark][1]} shrink-0 mt-0.5`} />
                      <span>{r.ours}{r.link && <> · <Link to={r.link} className="text-violet-300 hover:text-white">открыть</Link></>}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Продукты Сбер2В для бизнеса" icon="Layers" className="mb-8">
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
          {SBER_PRODUCTS.map(([h, t]) => (
            <div key={h} className="border-b border-white/5 pb-3"><div className="text-white text-sm font-medium">{h}</div><div className="text-xs text-white/55 mt-0.5">{t}</div></div>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-4">По открытым страницам sber2b.ru и sberanalytics.ru на октябрь 2026 года. Цены, состав демо-доступа и методики Сбер2В не публикуются.</p>
      </Card>

      <div className="bg-gradient-to-br from-violet-600/25 to-cyan-600/10 border border-violet-500/40 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <h2 className="font-['Oswald',sans-serif] text-2xl md:text-3xl font-bold mb-2">Начните с бесплатного анализа</h2>
          <p className="text-white/65">Выберите отрасль и регион — объём рынка, лидеры и структура откроются сразу, без звонка менеджера.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/analytics/databases" className="bg-white text-[#10101c] hover:bg-violet-100 px-6 py-3.5 rounded-2xl font-semibold">Базы компаний</Link>
          <Link to="/analytics/market" className="border border-white/25 hover:bg-white/10 px-6 py-3.5 rounded-2xl font-semibold text-white">Отчёты о рынках</Link>
        </div>
      </div>
    </BizShell>
  );
}
