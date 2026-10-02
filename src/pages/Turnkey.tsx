import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import TurnkeyForm, { type Plan } from "@/components/turnkey/TurnkeyForm";
import { ymGoal } from "@/lib/ym";
import { turnkeyProducts, turnkeySteps, turnkeySupport, turnkeyFaq, formatRub } from "@/lib/turnkey";

const PAGE_URL = "https://mat-labs.ru/gotovyy-biznes";
const TITLE = "Готовый IT-бизнес под ключ — запуск и сопровождение | МАТ-Лабс";
const DESCRIPTION =
  "Запустите готовый онлайн-бизнес под своим брендом: ИИ-сервис для ремонта, ИИ-репетитор, CRM-платформа или агрегатор услуг. Запуск от 250 000 ₽, сопровождение от 20 000 ₽/мес.";

export default function Turnkey() {
  const [preset, setPreset] = useState<{ product: string; plan: Plan; nonce: number }>({
    product: "",
    plan: "launch_support",
    nonce: 0,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const choose = (product: string, plan: Plan = "launch_support") => {
    ymGoal("turnkey_choose", { product });
    setPreset((p) => ({ product, plan, nonce: p.nonce + 1 }));
    document.getElementById("zayavka")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const minLaunch = Math.min(...turnkeyProducts.map((p) => p.launchPrice));
  const minSupport = Math.min(...turnkeyProducts.map((p) => p.supportPrice));

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Готовый бизнес под ключ",
    itemListElement: turnkeyProducts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: `${p.title} — готовый бизнес под ключ`,
        description: p.pitch,
        provider: { "@type": "Organization", name: "ООО МАТ-Лабс", url: "https://mat-labs.ru" },
        offers: { "@type": "Offer", priceCurrency: "RUB", price: String(p.launchPrice) },
      },
    })),
  };

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-x-0 top-0 h-[700px] grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs items={[{ label: "Готовый бизнес под ключ" }]} className="mb-10" />

          <header className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-emerald-300 border border-emerald-500/30 mb-6">
              <Icon name="Rocket" size={14} />
              Готовый бизнес под ключ
            </div>
            <h1 className="font-oswald text-4xl md:text-6xl font-bold leading-[1.05] mb-6">
              Запустите работающий{" "}
              <span className="gradient-text">IT-бизнес</span> под своим брендом
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Берёте проект, который уже работает у нас. Мы разворачиваем копию под ваш бренд и город,
              обучаем и ведём техническую часть. Вы занимаетесь клиентами.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={() => document.getElementById("proekty")?.scrollIntoView({ behavior: "smooth" })}
                className="btn-gradient px-7 py-4 rounded-2xl font-semibold text-white glow-purple flex items-center gap-2"
              >
                Выбрать проект
                <Icon name="ArrowDown" size={18} />
              </button>
              <button
                onClick={() => document.getElementById("zayavka")?.scrollIntoView({ behavior: "smooth" })}
                className="glass border border-white/20 px-7 py-4 rounded-2xl font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Бесплатный разбор
              </button>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {[
                { v: `от ${formatRub(minLaunch)}`, l: "запуск" },
                { v: "14–30 дней", l: "до старта" },
                { v: `от ${formatRub(minSupport)}`, l: "сопровождение в месяц" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-oswald text-2xl md:text-3xl font-bold gradient-text">{s.v}</div>
                  <div className="text-white/50 text-sm">{s.l}</div>
                </div>
              ))}
            </div>
          </header>

          <section id="proekty" className="scroll-mt-24 mb-20">
            <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-3">Проекты для запуска</h2>
            <p className="text-white/50 mb-8 max-w-2xl">Каждый уже работает онлайн — откройте и посмотрите до покупки.</p>
            <div className="grid lg:grid-cols-2 gap-6">
              {turnkeyProducts.map((p) => (
                <article key={p.id} className="glass neon-border rounded-3xl overflow-hidden flex flex-col">
                  <div className={`h-1.5 bg-gradient-to-r ${p.color}`} />
                  <div className="p-6 md:p-8 flex flex-col flex-1">
                    <div className="flex items-center gap-4 mb-5">
                      <img src={p.icon} alt={p.title} loading="lazy" className={`w-14 h-14 rounded-2xl object-cover bg-gradient-to-br ${p.color} ring-1 ring-white/10 flex-shrink-0`} />
                      <div className="min-w-0">
                        <h3 className="font-oswald text-2xl font-bold text-white">{p.title}</h3>
                        <p className="text-sm text-white/50">{p.niche}</p>
                      </div>
                    </div>

                    <p className="text-white/75 leading-relaxed mb-4">{p.pitch}</p>
                    <p className="text-sm text-white/50 mb-6">
                      <span className="text-white/70">Подойдёт:</span> {p.whoFor}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-5 mb-6">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Что входит</p>
                        <ul className="space-y-1.5">
                          {p.included.map((x) => (
                            <li key={x} className="flex gap-2 text-sm text-white/80 leading-snug">
                              <Icon name="Check" size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">На чём зарабатывать</p>
                        <ul className="space-y-1.5">
                          {p.earn.map((x) => (
                            <li key={x} className="flex gap-2 text-sm text-white/80 leading-snug">
                              <Icon name="Coins" size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                          <div className="text-[11px] text-white/40 mb-1">Запуск</div>
                          <div className="font-semibold text-white text-sm md:text-base">{formatRub(p.launchPrice)}</div>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                          <div className="text-[11px] text-white/40 mb-1">Сопровождение</div>
                          <div className="font-semibold text-white text-sm md:text-base">{formatRub(p.supportPrice)}<span className="text-white/40 text-xs">/мес</span></div>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                          <div className="text-[11px] text-white/40 mb-1">Срок</div>
                          <div className="font-semibold text-white text-sm md:text-base">{p.launchDays}</div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => choose(p.title)}
                          className={`flex-1 rounded-xl py-3 font-semibold text-white bg-gradient-to-r ${p.color} hover:opacity-90 transition-opacity`}
                        >
                          Хочу запустить
                        </button>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => ymGoal("turnkey_demo", { product: p.title })}
                          className="sm:w-auto rounded-xl py-3 px-5 font-semibold text-white/80 hover:text-white border border-white/15 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                        >
                          Посмотреть вживую
                          <Icon name="ExternalLink" size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-8">Как проходит запуск</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {turnkeySteps.map((s, i) => (
                <div key={s.title} className="glass rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                      <Icon name={s.icon} size={20} className="text-violet-300" />
                    </div>
                    <span className="font-oswald text-2xl font-bold text-white/15">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1.5">{s.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20 grid lg:grid-cols-2 gap-6">
            <div className="glass neon-border rounded-3xl p-7 md:p-9">
              <div className="inline-flex items-center gap-2 text-xs text-emerald-300 mb-4">
                <Icon name="RefreshCw" size={14} />
                Ежемесячно
              </div>
              <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">Что входит в сопровождение</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {turnkeySupport.map((x) => (
                  <li key={x} className="flex gap-2.5 text-sm text-white/80 leading-snug">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Icon name="Check" size={12} className="text-white" />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-3xl p-7 md:p-9 border border-amber-500/25 bg-amber-500/[0.04]">
              <div className="inline-flex items-center gap-2 text-xs text-amber-300 mb-4">
                <Icon name="ShieldCheck" size={14} />
                Честно и заранее
              </div>
              <h2 className="font-oswald text-2xl md:text-3xl font-bold mb-5">Что мы обещаем, а что — нет</h2>
              <div className="space-y-4 text-sm leading-relaxed">
                <p className="flex gap-2.5 text-white/80">
                  <Icon name="CircleCheck" size={18} className="text-emerald-400 flex-shrink-0" />
                  Работающий продукт под вашим брендом, запуск в срок по договору, обучение и техническая поддержка.
                </p>
                <p className="flex gap-2.5 text-white/80">
                  <Icon name="CircleX" size={18} className="text-rose-400 flex-shrink-0" />
                  Мы не гарантируем доход. Выручка зависит от ваших продаж и продвижения — с этим помогаем советом, но не обещаем цифр.
                </p>
                <p className="flex gap-2.5 text-white/80">
                  <Icon name="MapPin" size={18} className="text-violet-300 flex-shrink-0" />
                  Один проект каждого типа на город — без конкуренции с другими нашими клиентами.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 max-w-3xl">
            <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-8">Частые вопросы</h2>
            <div className="space-y-3">
              {turnkeyFaq.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-4 p-5 text-left"
                    >
                      <span className="font-semibold text-white">{f.q}</span>
                      <Icon name="ChevronDown" size={18} className={`text-white/50 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && <p className="px-5 pb-5 text-white/65 leading-relaxed text-sm">{f.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section id="zayavka" className="scroll-mt-24 grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2">
              <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-4">Бесплатный разбор</h2>
              <p className="text-white/60 leading-relaxed mb-6">
                Оставьте заявку — созвонимся на 30 минут, проверим, свободен ли ваш город, и подскажем,
                какой проект лучше подойдёт под ваш опыт и бюджет.
              </p>
              <ul className="space-y-3 text-sm text-white/70">
                {["Ответим в течение рабочего дня", "Без обязательств и предоплаты", "Покажем проект вживую"].map((x) => (
                  <li key={x} className="flex gap-2.5">
                    <Icon name="Check" size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-3 relative">
              <TurnkeyForm preset={preset} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
