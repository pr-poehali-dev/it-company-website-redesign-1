import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { cities } from "@/lib/cities";
import { geoServices } from "@/lib/serviceGeo";
import { ymGoal } from "@/lib/ym";

const SITE = "https://mat-labs.ru";
const PAGE_URL = `${SITE}/uslugi`;

export default function ServicesGeoIndex() {
  const navigate = useNavigate();
  const [active, setActive] = useState(geoServices[0].slug);
  const svc = geoServices.find((s) => s.slug === active) ?? geoServices[0];
  const total = geoServices.length * cities.length;
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Услуги МАТ-Лабс по городам России",
    numberOfItems: geoServices.length,
    itemListElement: geoServices.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.h1,
      url: `${SITE}/services/${s.slug}`,
    })),
  };

  return (
    <>
      <Helmet>
        <title>Услуги по городам России — разработка, ИИ, аналитика | МАТ-Лабс</title>
        <meta
          name="description"
          content={`Разработка сайтов, AI-автоматизация, ИИ-решения, аналитика и мобильные приложения в ${cities.length} городах России. Цены от 150 000 ₽, работаем удалённо по всей стране.`}
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ООО МАТ-Лабс" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:title" content="Услуги по городам России — МАТ-Лабс" />
        <meta
          property="og:description"
          content="Разработка, ИИ и аналитика по всей России. Цены от 150 000 ₽."
        />
        <meta property="og:url" content={PAGE_URL} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs items={[{ label: "Услуги по городам" }]} className="mb-8" />

          <header className="mb-10">
            <h1 className="font-oswald text-4xl md:text-5xl font-bold mb-5 leading-tight">
              Услуги по городам России
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl mb-4">
              Разработка сайтов, AI-автоматизация, ИИ-решения, аналитика данных,
              мобильные приложения и кибербезопасность. Цены от 150 000 ₽.
            </p>
            <p className="text-white/45 leading-relaxed max-w-3xl">
              Головной офис в Самаре, работаем по всей стране дистанционно.
              Наценки за регион не делаем: стоимость зависит от объёма задачи, а
              не от местоположения заказчика.
            </p>
          </header>

          <div className="grid sm:grid-cols-3 gap-3 mb-12">
            {[
              ["Layers", `${geoServices.length} услуг`, "Полный цикл разработки"],
              ["MapPin", `${cities.length} городов`, "По всей России"],
              ["Wallet", "от 150 000 ₽", "Единая цена для регионов"],
            ].map(([i, t, d], k) => (
              <div key={k} className="glass border border-white/10 rounded-xl p-5">
                <Icon name={i} size={18} className="text-violet-400 mb-3" />
                <div className="font-oswald text-xl font-bold text-white mb-1">{t}</div>
                <div className="text-white/45 text-sm">{d}</div>
              </div>
            ))}
          </div>

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
              Выберите услугу и город
            </h2>

            <div className="flex flex-wrap gap-2 mb-6">
              {geoServices.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => setActive(s.slug)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    active === s.slug
                      ? "border-violet-500/60 bg-violet-500/10 text-white"
                      : "border-white/10 text-white/50 hover:border-white/25"
                  }`}
                >
                  <Icon name={s.icon} size={15} />
                  {s.short}
                </button>
              ))}
            </div>

            <div className="glass neon-border rounded-2xl p-6 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-oswald text-2xl font-bold mb-2">{svc.h1}</h3>
                  <p className="text-white/55 text-sm leading-relaxed max-w-2xl">
                    {svc.intro}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-oswald text-2xl font-bold gradient-text">
                    от {fmt(svc.price)} ₽
                  </div>
                  <div className="text-white/40 text-xs">{svc.days}</div>
                </div>
              </div>
              <Link
                to={`/services/${svc.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                Подробнее об услуге
                <Icon name="ArrowRight" size={14} />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {cities.map((c) => (
                <Link
                  key={c.slug}
                  to={`/uslugi/${svc.slug}/${c.slug}`}
                  className="glass border border-white/10 rounded-xl p-4 hover:border-violet-500/40 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm mb-0.5 truncate">
                        {svc.short} в {c.nameIn}
                      </div>
                      <div className="text-white/35 text-xs">{c.population}</div>
                    </div>
                    <Icon
                      name="ArrowRight"
                      size={14}
                      className="text-white/20 group-hover:text-white/60 transition-colors shrink-0"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-4">
              Как мы работаем с регионами
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["Video", "Встречи онлайн", "Обсуждаем задачу по видеосвязи в удобное вам время с учётом часового пояса."],
                ["FileSignature", "Электронный документооборот", "Договор и акты подписываем дистанционно — приезжать никуда не нужно."],
                ["Wallet", "Единая цена", "Стоимость зависит от объёма задачи, а не от города заказчика."],
                ["MessageCircle", "Связь в рабочее время", "Общий чат по проекту, ответ в течение рабочего дня, еженедельный статус."],
              ].map(([i, t, d], k) => (
                <div key={k} className="glass border border-white/10 rounded-xl p-5">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                    <Icon name={i} size={17} className="text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{t}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass neon-border rounded-2xl p-8 text-center">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-3">
              Не нашли свой город или услугу?
            </h2>
            <p className="text-white/50 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
              Работаем со всей Россией и берёмся за задачи за пределами этого
              списка. Опишите, что нужно, — разберём и назовём стоимость.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  ymGoal("cta_click", { source: "services_geo_index" });
                  navigate("/consultant");
                }}
                className="btn-gradient px-8 py-4 rounded-xl font-semibold text-white glow-purple inline-flex items-center gap-2"
              >
                Получить бесплатный разбор
                <Icon name="ArrowRight" size={18} />
              </button>
              <Link
                to="/skolko-stoit-avtomatizaciya"
                className="glass border border-white/20 px-8 py-4 rounded-xl font-semibold text-white hover:border-white/40 transition-all inline-flex items-center"
              >
                Рассчитать стоимость
              </Link>
            </div>
            <p className="text-white/25 text-xs mt-5">
              Всего доступно {total} комбинаций услуг и городов
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
