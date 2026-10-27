import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { useLoaderData } from "@tanstack/react-router";
import { Helmet } from "@/lib/helmet";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { OG_IMAGE } from "@/components/biz/BizShell";
import RadarAccessForm from "@/components/radar/RadarAccessForm";
import { RadarCompany as Company, RADAR_URL, fmtMoney, fmtDate, prettyName, SOURCE_LABEL } from "@/components/radar/radarApi";

interface Similar { inn: string; name: string; total_amount: number; last_date: string | null; employees: number | null }

const SIGNAL_ICON: Record<string, string> = {
  fresh: "Zap", big: "Banknote", regular: "Repeat", staff: "Users", industry: "Factory", tech: "Lightbulb",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-white/5 last:border-0 text-sm">
      <span className="text-white/45">{label}</span>
      <span className="text-white/90 text-right">{value || "—"}</span>
    </div>
  );
}

export default function RadarCompany() {
  const { inn = "" } = useParams();
  const loaded = (useLoaderData({ strict: false }) as { data?: { company: Company; similar: Similar[] } | null } | undefined)?.data ?? null;
  const [data, setData] = useState<{ company: Company; similar: Similar[] } | null>(loaded);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setError("");
    setShowForm(false);
    const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
    if (loaded && loaded.company?.inn === inn && !token) { setData(loaded); return; }
    if (!loaded || loaded.company?.inn !== inn) setData(null);
    fetch(`${RADAR_URL}/?action=company&inn=${encodeURIComponent(inn)}`, { headers: token ? { "X-Session-Token": token } : {} })
      .then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Не удалось загрузить данные"));
  }, [inn, loaded]);

  const c = data?.company;
  const name = c ? prettyName(c.name) : "";
  const title = c ? `${name} — господдержка ${fmtMoney(c.total_amount)}, ${c.region} | Радар заказчиков` : "Компания | Радар заказчиков";
  const desc = c ? `${name} (ИНН ${c.inn}), ${c.region}. ${c.activity}. Господдержка 2024–2026: ${fmtMoney(c.total_amount)}, последняя выплата ${fmtDate(c.last_date)}.` : "";

  return (
    <>
      <Helmet>
        <title>{title}</title>
        {desc && <meta name="description" content={desc} />}
        <link rel="canonical" href={`https://mat-labs.ru/radar/${inn}`} />
        <meta name="robots" content={error ? "noindex, follow" : "index, follow, max-image-preview:large"} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        {desc && <meta property="og:description" content={desc} />}
        <meta property="og:url" content={`https://mat-labs.ru/radar/${inn}`} />
        <meta property="og:site_name" content="МАТ-Лабс" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        {c && <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "Organization", name: name, taxID: c.inn,
          ...(c.ogrn ? { identifier: c.ogrn } : {}),
          address: { "@type": "PostalAddress", addressRegion: c.region, addressCountry: "RU" },
          ...(c.activity ? { description: c.activity } : {}),
        })}</script>}
      </Helmet>
      <div className="min-h-screen bg-[#080812] text-white font-['Golos_Text',sans-serif] overflow-x-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 relative">
          <PageBreadcrumbs items={[{ label: "Радар заказчиков", href: "/radar" }, { label: name || inn }]} className="mb-8" />

          {error && (
            <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-10 text-center">
              <p className="text-white/60 mb-4">{error}</p>
              <Link to="/radar" className="text-violet-300 hover:text-white">Вернуться в каталог</Link>
            </div>
          )}
          {!c && !error && <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />}

          {c && (
            <div className="grid lg:grid-cols-[1fr_340px] gap-6">
              <div className="space-y-6 min-w-0">
                <header>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">{c.segment}</span>
                    {c.size && <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">{c.size} предприятие</span>}
                  </div>
                  <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold leading-tight mb-2">{name}</h1>
                  <p className="text-white/60">{c.activity}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-white/50">
                    <span className="flex items-center gap-1.5"><Icon name="MapPin" size={14} />{c.region}</span>
                    <span>ИНН {c.inn}</span>
                    {c.ogrn && <span>ОГРН {c.ogrn}</span>}
                  </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    [fmtMoney(c.total_amount), "поддержка 2024–2026"],
                    [fmtMoney(c.last_amount), `последняя, ${fmtDate(c.last_date)}`],
                    [String(c.payments || "—"), "выплат за 3 года"],
                    [c.employees ? String(c.employees) : "—", "сотрудников"],
                  ].map(([v, l]) => (
                    <div key={l} className="bg-white/[0.04] backdrop-blur-sm border border-violet-500/25 rounded-2xl p-4">
                      <div className="font-['Oswald',sans-serif] text-2xl font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">{v}</div>
                      <div className="text-white/45 text-xs mt-1">{l}</div>
                    </div>
                  ))}
                </div>

                {c.signals.length > 0 && (
                  <section className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                    <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Icon name="Radar" size={18} className="text-violet-300" />Сигналы</h2>
                    <div className="space-y-2.5">
                      {c.signals.map(s => (
                        <div key={s.kind} className="flex gap-3 text-sm text-white/75">
                          <Icon name={SIGNAL_ICON[s.kind] || "Circle"} size={16} className="text-emerald-300 shrink-0 mt-0.5" />{s.text}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/40 mt-4">
                      По сумме поддержки компания входит в топ-{c.industry_top_pct}% из {c.industry_count.toLocaleString("ru-RU")} в отрасли «{c.industry || "—"}».
                    </p>
                  </section>
                )}

                <section className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                  <h2 className="font-semibold text-white mb-2">Господдержка</h2>
                  <Row label="Главный источник" value={SOURCE_LABEL[c.source] || c.source} />
                  <Row label="Кто выдал последнюю меру" value={c.source_full} />
                  <Row label="Дата последней выплаты" value={fmtDate(c.last_date)} />
                  <Row label="Лет с поддержкой (2021–2026)" value={c.support_years} />
                  <Row label="В реестре МСП с" value={c.msp_year} />
                  {c.registered_at && <Row label="Зарегистрирована" value={fmtDate(c.registered_at)} />}
                  {c.okved && <Row label="Код ОКВЭД" value={c.okved} />}
                  <Row label="Отрасль" value={c.industry} />
                </section>

                {c.offer && (
                  <section className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                    <h2 className="font-semibold text-white mb-2 flex items-center gap-2"><Icon name="Lightbulb" size={18} className="text-amber-300" />Что можно предложить</h2>
                    <p className="text-sm text-white/70">{c.offer}</p>
                  </section>
                )}

                {data.similar.length > 0 && (
                  <section>
                    <h2 className="font-semibold text-white mb-3">Похожие компании: {c.industry}, {c.region}</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {data.similar.map(s => (
                        <Link key={s.inn} to={`/radar/${s.inn}`} className="bg-white/[0.04] backdrop-blur-sm border border-white/10 hover:border-violet-500/50 rounded-xl p-4 transition-colors">
                          <div className="text-sm text-white font-medium line-clamp-1">{prettyName(s.name)}</div>
                          <div className="text-xs text-white/45 mt-1">{fmtMoney(s.total_amount)} · {fmtDate(s.last_date)}{s.employees ? ` · ${s.employees} чел.` : ""}</div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-6 self-start">
                <div className="bg-white/[0.04] backdrop-blur-sm border border-violet-500/25 rounded-2xl p-5">
                  <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Icon name={c.locked ? "Lock" : "LockOpen"} size={16} className="text-violet-300" />Контакты
                  </h2>
                  <Row label={c.head_post || "Руководитель"} value={c.head} />
                  <Row label="Телефон" value={c.phones} />
                  <Row label="Email" value={c.emails} />
                  <Row label="Сайт" value={!c.locked && c.website
                    ? <a href={`https://${c.website}`} target="_blank" rel="noreferrer nofollow" className="text-cyan-300 hover:underline">{c.website}</a>
                    : c.website} />
                  <Row label="Адрес" value={c.address} />
                  {c.website && (
                    <p className="text-[11px] text-white/40 mt-2 flex items-center gap-1.5">
                      <Icon name="ShieldCheck" size={12} className={c.website_confidence === "high" ? "text-emerald-300" : "text-amber-300"} />
                      {c.website_confidence === "high" ? "Сайт подтверждён: на нём указан ИНН компании" : "Сайт подтверждён по названию и региону"}
                    </p>
                  )}
                  {c.locked && !showForm && (
                    <button onClick={() => setShowForm(true)} className="w-full mt-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-colors px-4 py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2">
                      <Icon name="LockOpen" size={16} />Открыть контакты
                    </button>
                  )}
                  {c.locked && !c.phones && !c.emails && (
                    <p className="text-xs text-white/40 mt-3">Телефон и почта этой компании ещё собираются — по подписке найдём их по запросу.</p>
                  )}
                </div>
                {showForm && (
                  <div className="bg-white/[0.04] backdrop-blur-sm border border-violet-500/25 rounded-2xl p-5">
                    <RadarAccessForm plan="Старт" companyInn={c.inn} title="Пробный доступ на 3 дня" />
                  </div>
                )}
                <a href={`https://checko.ru/company/${c.ogrn}`} target="_blank" rel="noreferrer nofollow"
                  className="flex items-center justify-between bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-sm text-white/65 hover:text-white">
                  Проверить реквизиты в открытых данных<Icon name="ExternalLink" size={14} />
                </a>
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}