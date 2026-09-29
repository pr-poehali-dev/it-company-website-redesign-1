import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { ymGoal } from "@/lib/ym";

const PAGE_URL = "https://mat-labs.ru/skolko-stoit-avtomatizaciya";

interface TaskOption {
  id: string;
  label: string;
  icon: string;
  desc: string;
  base: number;
  days: string;
}

const tasks: TaskOption[] = [
  {
    id: "leads",
    label: "Не терять заявки",
    icon: "Inbox",
    desc: "Формы, CRM, уведомления менеджеру, автоответы клиенту",
    base: 150000,
    days: "7–10 дней",
  },
  {
    id: "ai",
    label: "AI отвечает клиентам",
    icon: "Bot",
    desc: "Ассистент 24/7, квалификация лидов, разбор обращений",
    base: 250000,
    days: "10–14 дней",
  },
  {
    id: "site",
    label: "Сайт, приносящий заявки",
    icon: "Globe",
    desc: "Конверсионный сайт с интеграцией в CRM и аналитикой",
    base: 180000,
    days: "7–10 дней",
  },
  {
    id: "analytics",
    label: "Видеть цифры бизнеса",
    icon: "BarChart3",
    desc: "Дашборды, отчёты, сведение данных из разных систем",
    base: 200000,
    days: "2 недели",
  },
  {
    id: "all",
    label: "Всё вместе, под ключ",
    icon: "Layers",
    desc: "Связка всех систем, дашборд, автоматизация процессов",
    base: 500000,
    days: "3–4 недели",
  },
];

interface SizeOption {
  id: string;
  label: string;
  desc: string;
  mult: number;
}

const sizes: SizeOption[] = [
  { id: "s", label: "До 50 заявок в месяц", desc: "Небольшая команда, простые процессы", mult: 1 },
  { id: "m", label: "50–300 заявок", desc: "Несколько менеджеров, есть регламенты", mult: 1.4 },
  { id: "l", label: "Больше 300 заявок", desc: "Отдел продаж, сложная маршрутизация", mult: 1.9 },
];

interface IntegrationOption {
  id: string;
  label: string;
  icon: string;
  price: number;
}

const integrations: IntegrationOption[] = [
  { id: "crm", label: "CRM (Битрикс24, amoCRM)", icon: "Database", price: 20000 },
  { id: "msg", label: "Telegram / WhatsApp", icon: "MessageCircle", price: 15000 },
  { id: "1c", label: "1С или ERP", icon: "Server", price: 35000 },
  { id: "mail", label: "Почта и рассылки", icon: "Mail", price: 12000 },
  { id: "analytics", label: "Метрика и сквозная аналитика", icon: "LineChart", price: 18000 },
  { id: "pay", label: "Платёжные системы", icon: "CreditCard", price: 25000 },
];

interface SupportOption {
  id: string;
  label: string;
  desc: string;
  monthly: number;
  months: number;
}

const supports: SupportOption[] = [
  { id: "none", label: "Только гарантия", desc: "1 месяц на исправление ошибок — входит в стоимость", monthly: 0, months: 0 },
  { id: "m3", label: "Сопровождение 3 месяца", desc: "30 000 ₽ в месяц", monthly: 30000, months: 3 },
  { id: "m6", label: "Сопровождение 6 месяцев", desc: "27 500 ₽ в месяц — выгоднее на 8%", monthly: 27500, months: 6 },
  { id: "m12", label: "Сопровождение 12 месяцев", desc: "25 000 ₽ в месяц — максимальная выгода", monthly: 25000, months: 12 },
];

export default function PriceCalculator() {
  const navigate = useNavigate();
  const [task, setTask] = useState<string>("leads");
  const [size, setSize] = useState<string>("s");
  const [picked, setPicked] = useState<string[]>(["crm"]);
  const [support, setSupport] = useState<string>("none");

  const result = useMemo(() => {
    const t = tasks.find((x) => x.id === task) ?? tasks[0];
    const s = sizes.find((x) => x.id === size) ?? sizes[0];
    const intSum = picked.reduce(
      (sum, id) => sum + (integrations.find((i) => i.id === id)?.price ?? 0),
      0
    );
    const project = Math.round((t.base * s.mult + intSum) / 5000) * 5000;
    const sup = supports.find((x) => x.id === support) ?? supports[0];
    const supportTotal = sup.monthly * sup.months;
    return {
      project,
      supportTotal,
      supportMonthly: sup.monthly,
      supportMonths: sup.months,
      total: project + supportTotal,
      days: t.days,
    };
  }, [task, size, picked, support]);

  function toggleIntegration(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const fmt = (n: number) => n.toLocaleString("ru-RU");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Сколько стоит автоматизация бизнес-процессов?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Базовая автоматизация обработки заявок — от 150 000 ₽ за 7–10 дней. Внедрение AI-ассистента — от 250 000 ₽. Комплексный проект под ключ — от 500 000 ₽. Итоговая цена зависит от объёма заявок и количества систем, которые нужно связать.",
        },
      },
      {
        "@type": "Question",
        name: "От чего зависит стоимость автоматизации?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "От трёх факторов: какую задачу решаем, какой объём заявок обрабатывает компания и сколько систем нужно связать между собой. Каждая интеграция — это отдельная работа: подключение CRM обходится в 20 000 ₽, связка с 1С — в 35 000 ₽.",
        },
      },
      {
        "@type": "Question",
        name: "Сколько стоит сопровождение после запуска?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "От 30 000 ₽ в месяц. При оплате за 6 месяцев — 27 500 ₽ в месяц, за 12 месяцев — 25 000 ₽ в месяц. В сопровождение входят доработки, контроль интеграций, приоритетная реакция на сбои и ежемесячный отчёт.",
        },
      },
      {
        "@type": "Question",
        name: "Окупается ли автоматизация?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Считать нужно от стоимости ручного труда. Если менеджер тратит 2 часа в день на перенос заявок, за год это около 500 часов. При зарплате 60 000 ₽ в месяц один такой сотрудник обходится компании примерно в 200 000 ₽ в год только на этой операции.",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Сколько стоит автоматизация бизнеса — расчёт цены | МАТ-Лабс</title>
        <meta
          name="description"
          content="Рассчитайте стоимость автоматизации бизнес-процессов за минуту. Базовые пакеты от 150 000 ₽, сопровождение от 30 000 ₽ в месяц. Без регистрации и звонков."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ООО МАТ-Лабс" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:title" content="Сколько стоит автоматизация бизнеса — расчёт цены" />
        <meta
          property="og:description"
          content="Рассчитайте стоимость автоматизации за минуту. Пакеты от 150 000 ₽, сопровождение от 30 000 ₽ в месяц."
        />
        <meta property="og:url" content={PAGE_URL} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs
            items={[{ label: "Сколько стоит автоматизация" }]}
            className="mb-8"
          />

          <header className="mb-12">
            <h1 className="font-oswald text-4xl md:text-5xl font-bold mb-5 leading-tight">
              Сколько стоит автоматизация бизнеса
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl">
              Честный расчёт без «цена по запросу». Выберите задачу и параметры —
              увидите вилку стоимости и срок внедрения. Без регистрации, звонков
              и обязательств.
            </p>
          </header>

          {/* Калькулятор */}
          <div className="glass neon-border rounded-2xl p-6 md:p-8 mb-8">
            <div className="mb-8">
              <h2 className="font-oswald text-xl font-semibold mb-1">
                1. Какую задачу нужно решить
              </h2>
              <p className="text-white/40 text-sm mb-4">
                Выберите то, что болит сильнее всего
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTask(t.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      task === t.id
                        ? "border-violet-500/60 bg-violet-500/10"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          task === t.id
                            ? "bg-gradient-to-br from-violet-500 to-purple-600"
                            : "bg-white/5"
                        }`}
                      >
                        <Icon name={t.icon} size={17} className="text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white mb-1">
                          {t.label}
                        </div>
                        <div className="text-white/45 text-xs leading-relaxed">
                          {t.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="font-oswald text-xl font-semibold mb-1">
                2. Сколько заявок обрабатываете
              </h2>
              <p className="text-white/40 text-sm mb-4">
                От объёма зависит сложность маршрутизации
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSize(s.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      size === s.id
                        ? "border-cyan-500/60 bg-cyan-500/10"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="font-semibold text-sm text-white mb-1">
                      {s.label}
                    </div>
                    <div className="text-white/45 text-xs">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="font-oswald text-xl font-semibold mb-1">
                3. Что нужно связать
              </h2>
              <p className="text-white/40 text-sm mb-4">
                Можно выбрать несколько или ничего
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {integrations.map((i) => {
                  const on = picked.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      onClick={() => toggleIntegration(i.id)}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        on
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            on
                              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                              : "bg-white/5"
                          }`}
                        >
                          <Icon name={i.icon} size={15} className="text-white" />
                        </div>
                        <span className="text-sm text-white/85 text-left">
                          {i.label}
                        </span>
                      </span>
                      <span className="text-xs text-white/40 shrink-0">
                        +{fmt(i.price)} ₽
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="font-oswald text-xl font-semibold mb-1">
                4. Что после запуска
              </h2>
              <p className="text-white/40 text-sm mb-4">
                Система живёт и меняется вместе с бизнесом
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {supports.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSupport(s.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      support === s.id
                        ? "border-amber-500/60 bg-amber-500/10"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="font-semibold text-sm text-white mb-1">
                      {s.label}
                    </div>
                    <div className="text-white/45 text-xs">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Результат */}
          <div className="glass neon-border rounded-2xl p-6 md:p-8 mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-cyan-600/10" />
            <div className="relative">
              <div className="text-white/40 text-sm mb-2">
                Ориентировочная стоимость проекта
              </div>
              <div className="font-oswald text-4xl md:text-5xl font-bold gradient-text mb-1">
                от {fmt(result.project)} ₽
              </div>
              <div className="text-white/50 text-sm mb-6">
                Срок внедрения — {result.days}
              </div>

              {result.supportMonths > 0 && (
                <div className="border-t border-white/10 pt-5 mb-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-white/60 text-sm">
                      Сопровождение {result.supportMonths} мес. по{" "}
                      {fmt(result.supportMonthly)} ₽
                    </span>
                    <span className="font-oswald text-xl font-bold text-white">
                      {fmt(result.supportTotal)} ₽
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mt-3 pt-3 border-t border-white/10">
                    <span className="text-white/80 font-semibold">
                      Итого за первый период
                    </span>
                    <span className="font-oswald text-2xl font-bold gradient-text">
                      {fmt(result.total)} ₽
                    </span>
                  </div>
                </div>
              )}

              <p className="text-white/40 text-xs leading-relaxed mb-6">
                Это ориентир, а не коммерческое предложение. Точная стоимость
                зависит от состояния ваших систем и требований к решению —
                называем её после бесплатного разбора задачи.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    ymGoal("cta_click", { source: "price_calculator" });
                    navigate("/consultant");
                  }}
                  className="btn-gradient px-7 py-3.5 rounded-xl font-semibold text-sm text-white glow-purple"
                >
                  Получить точный расчёт
                </button>
                <button
                  onClick={() => navigate("/#services")}
                  className="glass border border-white/20 px-7 py-3.5 rounded-xl font-semibold text-sm text-white hover:border-white/40 transition-all"
                >
                  Смотреть услуги
                </button>
              </div>
            </div>
          </div>

          {/* SEO-контент */}
          <article className="prose-invert max-w-none space-y-10">
            <section>
              <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-4">
                От чего зависит стоимость автоматизации
              </h2>
              <p className="text-white/60 leading-relaxed mb-4">
                На рынке принято отвечать «цена по запросу». Это удобно
                подрядчику и бесполезно заказчику: невозможно спланировать
                бюджет, не понимая порядка цифр. Разберём, из чего складывается
                сумма.
              </p>
              <div className="space-y-4">
                {[
                  {
                    t: "Сложность задачи",
                    d: "Настроить путь заявки от формы до менеджера — одна работа. Научить AI разбирать обращения и квалифицировать лиды — принципиально другая. Разница в цене — примерно в полтора-два раза.",
                  },
                  {
                    t: "Объём заявок",
                    d: "При пятидесяти обращениях в месяц достаточно простой маршрутизации. При трёхстах нужны правила распределения, приоритеты и защита от потерь при пиковой нагрузке.",
                  },
                  {
                    t: "Количество систем",
                    d: "Каждая интеграция — отдельная работа со своей документацией и ограничениями. Подключение CRM обходится примерно в 20 000 ₽, связка с 1С — в 35 000 ₽.",
                  },
                  {
                    t: "Состояние текущих систем",
                    d: "Если в CRM порядок и есть регламенты — работа идёт быстро. Если данные разрозненны, часть времени уходит на наведение порядка. Это выясняется на бесплатном разборе.",
                  },
                ].map((x, i) => (
                  <div key={i} className="glass border border-white/10 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-2">{x.t}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{x.d}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-4">
                Окупается ли автоматизация
              </h2>
              <p className="text-white/60 leading-relaxed mb-4">
                Считать стоит не от цены внедрения, а от стоимости ручного
                труда, который она заменяет.
              </p>
              <div className="glass border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-3">
                  Простой пример расчёта
                </h3>
                <p className="text-white/55 text-sm leading-relaxed mb-3">
                  Менеджер тратит около двух часов в день на перенос заявок
                  между системами, отправку типовых ответов и заполнение
                  таблиц. За год это примерно 500 рабочих часов.
                </p>
                <p className="text-white/55 text-sm leading-relaxed mb-3">
                  При зарплате 60 000 ₽ в месяц час работы сотрудника с учётом
                  налогов обходится компании примерно в 450 ₽. Значит, ручные
                  операции стоят около 225 000 ₽ в год — и это при одном
                  менеджере.
                </p>
                <p className="text-white/70 text-sm leading-relaxed">
                  Отдельно считаются потерянные заявки. Если из ста обращений в
                  месяц теряется пять, а средний чек составляет 30 000 ₽, потери
                  достигают 1,8 млн ₽ в год недополученной выручки.
                </p>
              </div>
              <p className="text-white/40 text-xs leading-relaxed mt-4">
                Цифры в примере условные и приведены для понимания логики
                расчёта. Реальную экономию считаем на бесплатном разборе по
                вашим данным.
              </p>
            </section>

            <section>
              <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-4">
                Почему мы не работаем дешевле 150 000 ₽
              </h2>
              <p className="text-white/60 leading-relaxed mb-3">
                Честный ответ: автоматизация за 30–50 тысяч — это либо
                настройка одной формы без интеграций, либо работа, которую
                придётся переделывать через три месяца.
              </p>
              <p className="text-white/60 leading-relaxed">
                Полноценное внедрение включает разбор процессов, проектирование
                логики, разработку, тестирование на реальных сценариях,
                обучение команды и поддержку после запуска. Мы предпочитаем
                сделать меньше проектов, но довести каждый до работающего
                результата.
              </p>
            </section>

            <section>
              <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
                Частые вопросы о стоимости
              </h2>
              <div className="space-y-4">
                {[
                  {
                    q: "Можно ли начать с малого и расширять постепенно?",
                    a: "Да, это рабочий подход. Начинаем с пакета «Заявки» за 150 000 ₽, убеждаемся, что процесс работает, и дальше наращиваем: добавляем AI-обработку, подключаем новые системы. Каждый следующий этап опирается на сделанное.",
                  },
                  {
                    q: "Что входит в стоимость, а что оплачивается отдельно?",
                    a: "В стоимость входят разбор задачи, разработка, настройка, тестирование, запуск, обучение команды и период поддержки. Отдельно оплачиваются подписки на сторонние сервисы: сама CRM, тарифы мессенджеров, доступ к языковым моделям.",
                  },
                  {
                    q: "Нужно ли платить за сопровождение обязательно?",
                    a: "Нет. В стоимость каждого пакета уже входит гарантийный период. Сопровождение — это отдельное решение для тех, кому нужно регулярно развивать систему. Многие подключают его через несколько месяцев после запуска.",
                  },
                  {
                    q: "Как происходит оплата?",
                    a: "Работаем по договору с разбивкой на этапы. Обычно это аванс перед стартом и оплата по факту сдачи этапов. Для крупных проектов срок разбивается на несколько контрольных точек с приёмкой результата.",
                  },
                ].map((x, i) => (
                  <div key={i} className="glass border border-white/10 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-2 text-sm">
                      {x.q}
                    </h3>
                    <p className="text-white/55 text-sm leading-relaxed">{x.a}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass neon-border rounded-2xl p-8 text-center">
              <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-3">
                Нужен точный расчёт под вашу задачу?
              </h2>
              <p className="text-white/50 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
                На бесплатном разборе изучим процессы, покажем, где вы теряете
                заявки и время, и назовём конкретную стоимость с планом
                внедрения.
              </p>
              <button
                onClick={() => {
                  ymGoal("cta_click", { source: "price_page_bottom" });
                  navigate("/consultant");
                }}
                className="btn-gradient px-8 py-4 rounded-xl font-semibold text-white glow-purple inline-flex items-center gap-2"
              >
                Получить бесплатный разбор
                <Icon name="ArrowRight" size={18} />
              </button>
            </section>
          </article>
        </div>
      </div>
    </>
  );
}
