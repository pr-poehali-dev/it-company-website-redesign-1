import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { findCity, cities } from "@/lib/cities";
import {
  findGeoService,
  geoServices,
  localAngle,
  priceAngle,
} from "@/lib/serviceGeo";
import { ymGoal } from "@/lib/ym";

const SITE = "https://mat-labs.ru";

export default function ServiceCityPage() {
  const { serviceSlug, citySlug } = useParams();
  const navigate = useNavigate();
  const svc = findGeoService(serviceSlug);
  const city = findCity(citySlug);

  if (!svc || !city) {
    navigate("/");
    return null;
  }

  const pageUrl = `${SITE}/uslugi/${svc.slug}/${city.slug}`;
  const title = `${svc.h1} в ${city.nameIn} — от ${svc.price.toLocaleString("ru-RU")} ₽ | МАТ-Лабс`;
  const description = `${svc.h1} в ${city.nameIn}: ${svc.intro.slice(0, 110)} Срок — ${svc.days}, цена от ${svc.price.toLocaleString("ru-RU")} ₽. Работаем удалённо.`;
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  const otherServices = geoServices.filter((s) => s.slug !== svc.slug);
  const otherCities = cities
    .filter((c) => c.slug !== city.slug && c.district === city.district)
    .slice(0, 8);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${svc.h1} в ${city.nameIn}`,
    description,
    serviceType: svc.short,
    provider: {
      "@type": "Organization",
      name: "ООО МАТ-Лабс",
      url: SITE,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Самара",
        addressCountry: "RU",
      },
    },
    areaServed: { "@type": "City", name: city.name },
    url: pageUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: String(svc.price),
      url: pageUrl,
      availability: "https://schema.org/InStock",
    },
  };

  const faqItems: [string, string][] = [
    [
      `Сколько стоит ${svc.nameGen} в ${city.nameIn}?`,
      `От ${fmt(svc.price)} ₽. Срок — ${svc.days}. Для компаний из ${city.nameGen} цена такая же, как для других регионов: наценки за удалённость нет.`,
    ],
    ...svc.faqExtra,
    [
      `Вы работаете с ${city.nameGen} удалённо?`,
      `Да. Головной офис в Самаре, проекты по стране ведём дистанционно: встречи онлайн, доступы настраиваем удалённо, документооборот электронный. На результат формат не влияет.`,
    ],
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
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
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs
            items={[
              { label: "Услуги", href: "/uslugi" },
              { label: svc.short, href: `/services/${svc.slug}` },
              { label: city.name },
            ]}
            className="mb-8"
          />

          <header className="mb-12">
            <div className="inline-flex items-center gap-2 glass px-3.5 py-1.5 rounded-full text-xs text-violet-300 border border-violet-500/30 mb-5">
              <Icon name="MapPin" size={13} />
              {city.name}
            </div>
            <h1 className="font-oswald text-4xl md:text-5xl font-bold mb-5 leading-tight">
              {svc.h1} в {city.nameIn}
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl mb-6">
              {svc.intro}
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <div className="glass border border-white/10 rounded-xl px-5 py-3">
                <div className="text-white/40 text-xs mb-0.5">Стоимость</div>
                <div className="font-oswald text-xl font-bold gradient-text">
                  от {fmt(svc.price)} ₽
                </div>
              </div>
              <div className="glass border border-white/10 rounded-xl px-5 py-3">
                <div className="text-white/40 text-xs mb-0.5">Срок</div>
                <div className="font-oswald text-xl font-bold text-white">
                  {svc.days}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                ymGoal("cta_click", { source: `geo_${svc.slug}_${city.slug}` });
                navigate("/consultant");
              }}
              className="btn-gradient px-7 py-3.5 rounded-xl font-semibold text-sm text-white glow-purple inline-flex items-center gap-2"
            >
              Обсудить задачу
              <Icon name="ArrowRight" size={16} />
            </button>
          </header>

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-4">
              Когда стоит обратиться
            </h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {svc.worksFor.map((w, i) => (
                <div
                  key={i}
                  className="glass border border-white/10 rounded-xl p-4 flex items-start gap-3"
                >
                  <Icon
                    name="Check"
                    size={16}
                    className="text-emerald-400 mt-0.5 shrink-0"
                  />
                  <span className="text-white/70 text-sm">{w}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
              Что входит в работу
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {svc.deliverables.map((f, i) => (
                <div key={i} className="glass border border-white/10 rounded-xl p-5">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                    <Icon name={f.icon} size={17} className="text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{f.t}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-4">
              Как работаем с {city.nameGen}
            </h2>
            <div className="glass border border-white/10 rounded-xl p-6 mb-4">
              <p className="text-white/65 leading-relaxed mb-4">
                {localAngle(svc, city)}
              </p>
              <p className="text-white/55 text-sm leading-relaxed">
                {priceAngle(svc, city)}
              </p>
            </div>
            <div className="glass border border-white/10 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-2 text-sm">
                Типичная ситуация в регионе
              </h3>
              <p className="text-white/55 text-sm leading-relaxed">{city.pain}</p>
            </div>
          </section>

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
              Этапы работы
            </h2>
            <div className="space-y-3">
              {[
                ["Бесплатный разбор", "Изучаем задачу, оцениваем объём и называем стоимость. Без обязательств."],
                ["Согласование плана", "Фиксируем состав работ, сроки и цену в договоре."],
                ["Разработка", "Выполняем работу, показываем промежуточные результаты."],
                ["Сдача и запуск", "Передаём результат, обучаем команду, сопровождаем на старте."],
              ].map(([t, d], i) => (
                <div
                  key={i}
                  className="flex gap-4 glass border border-white/10 rounded-xl p-4"
                >
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

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
              Частые вопросы
            </h2>
            <div className="space-y-3">
              {faqItems.map(([q, a], i) => (
                <div key={i} className="glass border border-white/10 rounded-xl p-5">
                  <h3 className="font-semibold text-white text-sm mb-2">{q}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="font-oswald text-xl font-bold mb-4">
              Другие услуги в {city.nameIn}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-8">
              {otherServices.map((s) => (
                <Link
                  key={s.slug}
                  to={`/uslugi/${s.slug}/${city.slug}`}
                  className="glass border border-white/10 rounded-xl p-4 hover:border-violet-500/40 transition-all group"
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <Icon name={s.icon} size={15} className="text-violet-400" />
                    <span className="font-semibold text-white text-sm">
                      {s.short}
                    </span>
                  </div>
                  <div className="text-white/35 text-xs">
                    от {fmt(s.price)} ₽
                  </div>
                </Link>
              ))}
            </div>

            <h2 className="font-oswald text-xl font-bold mb-4">
              {svc.short} в других городах
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherCities.map((c) => (
                <Link
                  key={c.slug}
                  to={`/uslugi/${svc.slug}/${c.slug}`}
                  className="glass border border-white/10 px-4 py-2 rounded-lg text-sm text-white/55 hover:text-white hover:border-white/30 transition-all"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <Link
              to="/uslugi"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Все услуги и города
              <Icon name="ArrowRight" size={14} />
            </Link>
          </section>

          <section className="glass neon-border rounded-2xl p-8 text-center">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-3">
              Обсудим вашу задачу
            </h2>
            <p className="text-white/50 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
              Разберём задачу бесплатно, назовём точную стоимость и срок. Без
              обязательств — рекомендации останутся у вас в любом случае.
            </p>
            <button
              onClick={() => {
                ymGoal("cta_click", { source: `geo_bottom_${svc.slug}` });
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
