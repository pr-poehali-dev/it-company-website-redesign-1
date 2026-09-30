import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { cities } from "@/lib/cities";
import { ymGoal } from "@/lib/ym";

const SITE = "https://mat-labs.ru";
const PAGE_URL = `${SITE}/avtomatizaciya-biznesa`;

const districtOrder = [
  "Центральный федеральный округ",
  "Северо-Западный федеральный округ",
  "Приволжский федеральный округ",
  "Южный федеральный округ",
  "Уральский федеральный округ",
  "Сибирский федеральный округ",
  "Дальневосточный федеральный округ",
  "Северо-Кавказский федеральный округ",
];

export default function CitiesIndex() {
  const navigate = useNavigate();

  const grouped = districtOrder
    .map((d) => ({
      district: d,
      list: cities.filter((c) => c.district === d),
    }))
    .filter((g) => g.list.length > 0);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Автоматизация бизнеса по городам России",
    numberOfItems: cities.length,
    itemListElement: cities.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Автоматизация бизнеса в ${c.nameIn}`,
      url: `${SITE}/avtomatizaciya-biznesa/${c.slug}`,
    })),
  };

  return (
    <>
      <Helmet>
        <title>Автоматизация бизнеса по городам России — МАТ-Лабс</title>
        <meta
          name="description"
          content={`Автоматизация бизнес-процессов в ${cities.length} городах России: обработка заявок, интеграция CRM, внедрение AI. Пакеты от 150 000 ₽, работаем удалённо по всей стране.`}
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ООО МАТ-Лабс" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:title" content="Автоматизация бизнеса по городам России — МАТ-Лабс" />
        <meta
          property="og:description"
          content="Автоматизация бизнес-процессов по всей России. Пакеты от 150 000 ₽, внедрение за 7–14 дней."
        />
        <meta property="og:url" content={PAGE_URL} />
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs
            items={[{ label: "Автоматизация по городам" }]}
            className="mb-8"
          />

          <header className="mb-12">
            <h1 className="font-oswald text-4xl md:text-5xl font-bold mb-5 leading-tight">
              Автоматизация бизнеса по городам России
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl mb-4">
              Настраиваем обработку заявок, связываем CRM с сайтом и
              мессенджерами, внедряем AI-ассистента. Пакеты от 150 000 ₽,
              внедрение за 7–14 дней.
            </p>
            <p className="text-white/45 leading-relaxed max-w-3xl">
              Головной офис в Самаре, работаем с компаниями по всей стране
              дистанционно: встречи онлайн, настройка систем удалённая,
              документооборот электронный. Наценки за регион не делаем.
            </p>
          </header>

          <div className="grid sm:grid-cols-3 gap-3 mb-14">
            {[
              ["MapPin", `${cities.length} городов`, "Работаем по всей России"],
              ["Clock", "7–14 дней", "До первых результатов"],
              ["Wallet", "от 150 000 ₽", "Единая цена для всех регионов"],
            ].map(([i, t, d], k) => (
              <div key={k} className="glass border border-white/10 rounded-xl p-5">
                <Icon name={i} size={18} className="text-cyan-400 mb-3" />
                <div className="font-oswald text-xl font-bold text-white mb-1">{t}</div>
                <div className="text-white/45 text-sm">{d}</div>
              </div>
            ))}
          </div>

          <section className="mb-14 space-y-8">
            {grouped.map((g) => (
              <div key={g.district}>
                <h2 className="font-oswald text-lg font-semibold text-white/70 mb-3">
                  {g.district}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {g.list.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/avtomatizaciya-biznesa/${c.slug}`}
                      className="glass border border-white/10 rounded-xl p-4 hover:border-violet-500/40 hover:bg-white/[0.03] transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-white text-sm mb-0.5">
                            {c.name}
                          </div>
                          <div className="text-white/35 text-xs">
                            {c.population}
                          </div>
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
              </div>
            ))}
          </section>

          <section className="mb-14">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">
              Что входит в автоматизацию
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["Inbox", "Заявки в одной воронке", "Сайт, почта, телефон и мессенджеры сводятся в единую систему. Ни одно обращение не теряется."],
                ["Bot", "AI отвечает клиентам", "Ассистент работает круглосуточно, квалифицирует лиды и передаёт горячие заявки менеджеру."],
                ["Database", "Интеграция систем", "CRM, 1С, платёжные сервисы и аналитика связываются между собой без ручного переноса данных."],
                ["BarChart3", "Прозрачные цифры", "Дашборд с актуальными метриками вместо отчётов, которые собираются руками неделю."],
              ].map(([i, t, d], k) => (
                <div key={k} className="glass border border-white/10 rounded-xl p-5">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                    <Icon name={i} size={17} className="text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{t}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass neon-border rounded-2xl p-8 text-center">
            <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-3">
              Не нашли свой город?
            </h2>
            <p className="text-white/50 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
              Работаем со всей Россией, включая небольшие города. Опишите задачу
              — разберём процессы и назовём стоимость независимо от вашего
              местоположения.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  ymGoal("cta_click", { source: "cities_index" });
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
          </section>
        </div>
      </div>
    </>
  );
}
