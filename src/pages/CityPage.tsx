import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { findCity, cities } from "@/lib/cities";
import { ymGoal } from "@/lib/ym";

const SITE = "https://mat-labs.ru";

const packages = [
  {
    id: "leads",
    name: "Заявки",
    price: 150000,
    days: "7–10 дней",
    icon: "Inbox",
    items: [
      "Формы на сайте с защитой от спама",
      "Интеграция с вашей CRM",
      "Уведомления в Telegram менеджеру",
      "Автоответ клиенту в момент обращения",
      "Настройка воронки и этапов сделки",
    ],
  },
  {
    id: "ai",
    name: "AI-обработка",
    price: 250000,
    days: "10–14 дней",
    icon: "Bot",
    items: [
      "AI-ассистент отвечает клиентам круглосуточно",
      "Автоматическая квалификация лидов",
      "Разбор и классификация обращений",
      "Автоотчёты по заявкам и конверсии",
      "Три месяца поддержки после запуска",
    ],
  },
  {
    id: "turnkey",
    name: "Под ключ",
    price: 500000,
    days: "3–4 недели",
    icon: "Layers",
    items: [
      "Связка всех систем компании",
      "Дашборд с метриками в реальном времени",
      "Автоматизация внутренних процессов",
      "Обучение команды работе с системой",
      "Шесть месяцев поддержки",
    ],
  },
];

export default function CityPage() {
  const { citySlug } = useParams();
  const navigate = useNavigate();
  const city = findCity(citySlug);
  const [active, setActive] = useState("leads");

  const nearby = useMemo(() => {
    if (!city) return [];
    return cities
      .filter((c) => c.slug !== city.slug && c.district === city.district)
      .slice(0, 6);
  }, [city]);

  if (!city) {
    navigate("/");
    return null;
  }

  const pageUrl = `${SITE}/avtomatizaciya-biznesa/${city.slug}`;
  const title = `Автоматизация бизнеса в ${city.nameIn} — внедрение за 7–14 дней | МАТ-Лабс`;
  const description = `Автоматизация бизнес-процессов в ${city.nameIn}: обработка заявок, интеграция CRM, внедрение AI. Пакеты от 150 000 ₽, запуск за 7–14 дней. Работаем удалённо.`;
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const current = packages.find((p) => p.id === active) ?? packages[0];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Автоматизация бизнес-процессов в ${city.nameIn}`,
    description,
    serviceType: "Автоматизация бизнес-процессов",
    provider: {
      "@type": "Organization",
      name: "ООО МАТ-Лабс",
      url: SITE,
      taxID: "6312223437",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Самара",
        addressCountry: "RU",
      },
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "Country", name: "Россия" },
    },
    url: pageUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "150000",
      url: pageUrl,
      availability: "https://schema.org/InStock",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Сколько стоит автоматизация бизнеса в ${city.nameIn}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Пакет «Заявки» — от 150 000 ₽ за 7–10 дней. Пакет «AI-обработка» — от 250 000 ₽ за 10–14 дней. Комплексный проект под ключ — от 500 000 ₽. Цены для компаний из ${city.nameGen} такие же, как для остальных регионов: мы не делаем наценку за удалённость.`,
        },
      },
      {
        "@type": "Question",
        name: `Вы работаете с компаниями из ${city.nameGen} удалённо?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Да. Встречи проводим онлайн, доступ к системам настраиваем удалённо, документооборот электронный. Формат работы не влияет ни на сроки, ни на качество: большинство проектов ведём дистанционно.`,
        },
      },
      {
        "@type": "Question",
        name: "Сколько времени занимает внедрение?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Базовая автоматизация обработки заявок — 7–10 дней. Внедрение AI-ассистента — 10–14 дней. Комплексный проект — 3–4 недели. Первые рабочие результаты показываем на первой неделе.",
        },
      },
      {
        "@type": "Question",
        name: "Что происходит после запуска системы?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "В стоимость каждого пакета входит период гарантийной поддержки. Дальше можно подключить абонентское сопровождение от 30 000 ₽ в месяц: доработки, контроль интеграций, приоритетная реакция на сбои и ежемесячный отчёт.",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ООО МАТ-Лабс" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        <meta name="geo.placename" content={city.name} />
        <meta name="geo.region" content="RU" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs
            items={[
              { label: "Автоматизация по городам", href: "/avtomatizaciya-biznesa" },
              { label: city.name },
            ]}
            className="mb-8"
          />

          <header className="mb-12">
            <div className="inline-flex items-center gap-2 glass px-3.5 py-1.5 rounded-full text-xs text-cyan-300 border border-cyan-500/30 mb-5">
              <Icon name="MapPin" size={13} />
              {city.name} · {city.district}
            </div>
            <h1 className="font-oswald text-4xl md:text-5xl font-bold mb-5 leading-tight">
              Автоматизация бизнеса в {city.nameIn}
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl mb-4">
              Настраиваем обработку заявок, связываем CRM с сайтом и мессенджерами,
              внедряем AI-ассистента. Первые результаты — за 7–14 дней.
            </p>
            <p className="text-white/45 leading-relaxed max-w-3xl">
              {city.context}
            </p>
          </header>

          {/* Пакеты */}
          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-2">
              Пакеты автоматизации
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Цены для компаний из {city.nameGen} — без наценки за регион
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActive(p.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    active === p.id
                      ? "border-violet-500/60 bg-violet-500/10 text-white"
                      : "border-white/10 text-white/50 hover:border-white/25"
                  }`}
                >
                  <Icon name={p.icon} size={15} />
                  {p.name}
                </button>
              ))}
            </div>

            <div className="glass neon-border rounded-2xl p-6 md:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
                <div>
                  <div className="font-oswald text-3xl md:text-4xl font-bold gradient-text">
                    от {fmt(current.price)} ₽
                  </div>
                  <div className="text-white/45 text-sm mt-1">
                    Срок внедрения — {current.days}
                  </div>
                </div>
                <button
                  onClick={() => {
                    ymGoal("cta_click", { source: `city_${city.slug}` });
                    navigate("/consultant");
                  }}
                  className="btn-gradient px-6 py-3 rounded-xl font-semibold text-sm text-white glow-purple"
                >
                  Обсудить задачу
                </button>
              </div>
              <ul className="space-y-2.5">
                {current.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Icon
                      name="Check"
                      size={16}
                      className="text-emerald-400 mt-0.5 shrink-0"
                    />
                    <span className="text-white/65 text-sm leading-relaxed">{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/skolko-stoit-avtomatizaciya"
              className="inline-flex items-center gap-1.5 mt-5 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Рассчитать стоимость под свою задачу
              <Icon name="ArrowRight" size={14} />
            </Link>
          </section>

          {/* Локальный контекст */}
          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
              С какими задачами к нам приходят из {city.nameGen}
            </h2>
            <div className="glass border border-white/10 rounded-xl p-6 mb-5">
              <p className="text-white/65 leading-relaxed mb-4">{city.pain}</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Ключевые отрасли региона: {city.industries.join(", ")}. Мы не
                делаем отраслевых допущений вслепую — на бесплатном разборе
                изучаем именно ваши процессы и считаем эффект по вашим цифрам.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  i: "Inbox",
                  t: "Заявки теряются между каналами",
                  d: "Сайт, почта, телефон, мессенджеры — обращения приходят отовсюду и оседают у разных сотрудников. Сводим всё в одну воронку.",
                },
                {
                  i: "Clock",
                  t: "Клиент ждёт ответа часами",
                  d: "Пока менеджер освободится, клиент успевает написать конкурентам. Автоответ и распределение решают это за минуты.",
                },
                {
                  i: "FileSpreadsheet",
                  t: "Данные живут в таблицах",
                  d: "Отчёт собирается руками несколько дней и устаревает к моменту готовности. Настраиваем дашборд с актуальными цифрами.",
                },
                {
                  i: "Repeat",
                  t: "Менеджеры делают одно и то же",
                  d: "Перенос данных между системами, типовые ответы, заполнение карточек — всё это передаётся автоматике.",
                },
              ].map((x, i) => (
                <div key={i} className="glass border border-white/10 rounded-xl p-5">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                    <Icon name={x.i} size={17} className="text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{x.t}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{x.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Как работаем */}
          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-3">
              Как мы работаем с компаниями из {city.nameGen}
            </h2>
            <p className="text-white/55 leading-relaxed mb-6">
              Головной офис находится в Самаре, работаем с компаниями по всей
              России дистанционно. Встречи проводим онлайн, доступ к системам
              настраиваем удалённо, документы подписываем электронно. Формат не
              влияет ни на сроки, ни на результат.
            </p>
            <div className="space-y-3">
              {[
                ["Бесплатный разбор", "Изучаем процессы, находим точки потерь, оцениваем эффект в деньгах. Без обязательств."],
                ["План внедрения", "Фиксируем задачи, сроки и стоимость в договоре. Вы понимаете, за что платите."],
                ["Разработка и настройка", "Собираем решение под ваши процессы, показываем промежуточные результаты."],
                ["Интеграция", "Подключаем сайт, CRM, мессенджеры и почту в единый контур."],
                ["Запуск и обучение", "Переводим команду на новый процесс и сопровождаем после старта."],
              ].map(([t, d], i) => (
                <div key={i} className="flex gap-4 glass border border-white/10 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 font-oswald font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1">{t}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
              Частые вопросы
            </h2>
            <div className="space-y-3">
              {[
                [
                  `Сколько стоит автоматизация бизнеса в ${city.nameIn}?`,
                  `Пакет «Заявки» — от 150 000 ₽ за 7–10 дней. «AI-обработка» — от 250 000 ₽. Под ключ — от 500 000 ₽. Для компаний из ${city.nameGen} цены такие же: наценки за удалённость мы не делаем.`,
                ],
                [
                  `Вы работаете удалённо?`,
                  `Да. Встречи онлайн, настройка систем удалённая, документооборот электронный. Большинство проектов ведём дистанционно, и на результат это не влияет.`,
                ],
                [
                  "Сколько времени занимает внедрение?",
                  "Обработка заявок — 7–10 дней, AI-ассистент — 10–14 дней, комплексный проект — 3–4 недели. Первые рабочие результаты показываем уже на первой неделе.",
                ],
                [
                  "Что после запуска?",
                  "В каждый пакет входит гарантийный период. Дальше по желанию — сопровождение от 30 000 ₽ в месяц: доработки, контроль интеграций, отчёты.",
                ],
                [
                  "Можно ли доработать то, что уже есть?",
                  "Да. Часто дешевле и быстрее подключить автоматизацию к текущему сайту и CRM, чем строить заново. Это выясняется на разборе.",
                ],
              ].map(([q, a], i) => (
                <div key={i} className="glass border border-white/10 rounded-xl p-5">
                  <h3 className="font-semibold text-white text-sm mb-2">{q}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Соседние города */}
          {nearby.length > 0 && (
            <section className="mb-14">
              <h2 className="font-oswald text-xl font-bold mb-4">
                Другие города округа
              </h2>
              <div className="flex flex-wrap gap-2">
                {nearby.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/avtomatizaciya-biznesa/${c.slug}`}
                    className="glass border border-white/10 px-4 py-2 rounded-lg text-sm text-white/55 hover:text-white hover:border-white/30 transition-all"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
              <Link
                to="/avtomatizaciya-biznesa"
                className="inline-flex items-center gap-1.5 mt-4 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                Все города
                <Icon name="ArrowRight" size={14} />
              </Link>
            </section>
          )}

          <section className="glass neon-border rounded-2xl p-8 text-center">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-3">
              Разберём вашу задачу бесплатно
            </h2>
            <p className="text-white/50 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
              Покажем, где теряются заявки и время, назовём стоимость и срок
              внедрения. Без обязательств — рекомендации останутся у вас в любом
              случае.
            </p>
            <button
              onClick={() => {
                ymGoal("cta_click", { source: `city_bottom_${city.slug}` });
                navigate("/consultant");
              }}
              className="btn-gradient px-8 py-4 rounded-xl font-semibold text-white glow-purple inline-flex items-center gap-2"
            >
              Получить бесплатный разбор
              <Icon name="ArrowRight" size={18} />
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
