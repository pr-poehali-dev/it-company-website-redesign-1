import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { services } from "@/components/shared";
import Icon from "@/components/ui/icon";

export default function ServicePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const service = services.find((s) => s.slug === slug);

  if (!service) {
    navigate("/");
    return null;
  }

  const pageTitle = `${service.title} — ООО МАТ-Лабс`;
  const pageUrl = `https://mat-labs.ru/services/${service.slug}`;
  const ogImage = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/bucket/445e832b-e1ed-413e-a842-7a510d6d41f1.jpg";

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.fullDesc,
    "provider": {
      "@type": "Organization",
      "name": "ООО МАТ-Лабс",
      "url": "https://mat-labs.ru"
    },
    "priceRange": service.price,
    "url": pageUrl,
    "areaServed": "RU",
    "availableLanguage": "Russian"
  };

  return (
    <>
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={service.fullDesc} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={pageUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={service.fullDesc} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:locale" content="ru_RU" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={service.fullDesc} />
      <meta name="twitter:image" content={ogImage} />
      <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
    </Helmet>
    <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
      {/* Back button */}
      <div className="fixed top-6 left-6 z-50">
        <button
          onClick={() => navigate("/#services")}
          className="flex items-center gap-2 glass border border-white/10 px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:border-white/30 transition-all"
        >
          <Icon name="ArrowLeft" size={16} />
          Назад
        </button>
      </div>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-40" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br ${service.color} opacity-10 rounded-full blur-3xl`} />

        <div className="max-w-4xl mx-auto relative">
          <div className={`inline-block glass px-4 py-1.5 rounded-full text-sm border mb-6 ${service.tagColor}`}>
            Услуга
          </div>
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6`}>
            <Icon name={service.icon} size={30} className="text-white" />
          </div>
          <h1 className="font-oswald text-5xl md:text-6xl font-bold mb-6 leading-tight">
            {service.title}
          </h1>
          <p className="text-white/60 text-xl leading-relaxed max-w-2xl mb-8">
            {service.fullDesc}
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/consultant")}
              className={`btn-gradient px-8 py-4 rounded-2xl font-semibold text-white text-base flex items-center gap-2`}
            >
              Обсудить проект
              <Icon name="MessageCircle" size={18} />
            </button>
            <div className="glass border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-2">
              <span className="text-white/50 text-sm">Стоимость:</span>
              <span className="font-semibold text-white">{service.price}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-12 text-center">
            Что входит в <span className={`bg-gradient-to-r ${service.color} bg-clip-text text-transparent`}>услугу</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {service.features.map((f, i) => (
              <div key={i} className="glass border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                  <Icon name={f.icon} size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-12 text-center">
            Как мы <span className={`bg-gradient-to-r ${service.color} bg-clip-text text-transparent`}>работаем</span>
          </h2>
          <div className="space-y-4">
            {service.process.map((p, i) => (
              <div key={i} className="glass border border-white/10 rounded-2xl p-6 flex items-start gap-6">
                <div className={`font-oswald text-3xl font-bold bg-gradient-to-br ${service.color} bg-clip-text text-transparent opacity-60 shrink-0 w-12`}>
                  {p.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{p.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-4 text-center">
            Пакеты и <span className={`bg-gradient-to-r ${service.color} bg-clip-text text-transparent`}>цены</span>
          </h2>
          <p className="text-white/40 text-center mb-12">Итоговая стоимость зависит от требований проекта</p>
          <div className="grid md:grid-cols-3 gap-6">
            {service.packages.map((pkg, i) => (
              <div
                key={i}
                className={`glass border rounded-2xl p-7 flex flex-col ${i === 1 ? `border-gradient-to-br ${service.color} border-white/30` : "border-white/10"}`}
                style={i === 1 ? { borderColor: "rgba(255,255,255,0.25)" } : {}}
              >
                {i === 1 && (
                  <div className={`inline-block text-xs px-3 py-1 rounded-full bg-gradient-to-r ${service.color} text-white font-medium mb-4 self-start`}>
                    Популярный
                  </div>
                )}
                <h3 className="font-oswald text-xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-white/40 text-sm mb-4">{pkg.desc}</p>
                <div className="font-oswald text-2xl font-bold text-white mb-6">{pkg.price}</div>
                <ul className="space-y-3 flex-1">
                  {pkg.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-white/70">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${service.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon name="Check" size={11} className="text-white" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/consultant")}
                  className={`mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-all ${i === 1 ? `bg-gradient-to-r ${service.color} text-white` : "glass border border-white/20 text-white hover:border-white/40"}`}
                >
                  Оставить заявку
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center glass border border-white/10 rounded-3xl p-12">
          <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-4">
            Готовы начать проект?
          </h2>
          <p className="text-white/50 mb-8">Наш AI-консультант поможет сформулировать задачу и подготовить техническое задание</p>
          <button
            onClick={() => navigate("/consultant")}
            className="btn-gradient px-10 py-4 rounded-2xl font-semibold text-white text-base inline-flex items-center gap-2"
          >
            Поговорить с консультантом
            <Icon name="ArrowRight" size={18} />
          </button>
        </div>
      </section>
    </div>
    </>
  );
}