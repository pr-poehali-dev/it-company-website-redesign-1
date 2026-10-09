import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { ymGoal } from "@/lib/ym";
import {
  investorThesis, investorHighlights, marketFacts, marketNote, problemPoints, ladderModel, ltvPath,
  ecosystem, verticals, channels, roadmap, scenarios, baseQuarters, modelAssumptions, investmentAsk,
  swot, risks, kpis,
} from "@/lib/investors";

const PAGE_URL = "https://mat-labs.ru/investors";
const TITLE = "Инвесторам — стратегия развития MAT Labs 2026–2027";
const DESCRIPTION =
  "Стратегия MAT Labs: AI-автоматизация для среднего бизнеса, модель «аудит → пилот → внедрение → подписка», 12 собственных AI-продуктов, финансовая модель на 2027 год.";

const fmtRub = (n: number) => n.toLocaleString("ru-RU");

function H2({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="text-xs uppercase tracking-widest text-violet-300/80 mb-3">{tag}</div>
      <h2 className="font-oswald text-3xl md:text-4xl font-bold">{children}</h2>
    </div>
  );
}

export default function Investors() {
  const ltvTotal = ltvPath.reduce((s, x) => s + x.value, 0);
  const maxQ = Math.max(...baseQuarters.map((q) => q.revenue));

  const contact = (source: string) => {
    ymGoal("investor_contact", { source });
    window.location.href = "/#contacts";
  };

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-x-0 top-0 h-[700px] grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs items={[{ label: "Инвесторам" }]} className="mb-10" />

          <header className="mb-20">
            <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
              <Icon name="TrendingUp" size={14} />
              Стратегия развития 2026–2027
            </div>
            <h1 className="font-oswald text-4xl md:text-6xl font-bold leading-[1.05] mb-6 max-w-4xl">
              {investorThesis.title}
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-3xl">{investorThesis.lead}</p>
            <div className="flex flex-wrap gap-4 mb-12">
              <a
                href="/MAT-Labs-strategiya-dlya-investorov.docx"
                download
                onClick={() => ymGoal("investor_doc_download")}
                className="btn-gradient px-7 py-4 rounded-2xl font-semibold text-white glow-purple flex items-center gap-2"
              >
                <Icon name="Download" size={18} />
                Скачать стратегию (Word)
              </a>
              <button
                onClick={() => contact("hero")}
                className="glass border border-white/20 px-7 py-4 rounded-2xl font-semibold text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                Связаться с основателем
                <Icon name="ArrowRight" size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {investorHighlights.map((h) => (
                <div key={h.label} className="glass neon-border rounded-2xl p-5">
                  <div className="font-oswald text-3xl md:text-4xl font-bold gradient-text">{h.value}</div>
                  <div className="text-white/50 text-sm mt-1">{h.label}</div>
                </div>
              ))}
            </div>
          </header>

          <section className="mb-20">
            <H2 tag="01 · Рынок">Рынок растёт быстрее, чем бизнес успевает внедрять</H2>
            <div className="grid md:grid-cols-3 gap-5 mb-6">
              {marketFacts.map((m) => (
                <div key={m.value} className="glass neon-border rounded-2xl p-6">
                  <div className="font-oswald text-4xl font-bold gradient-text-3 mb-2">{m.value}</div>
                  <p className="text-white/70 text-sm leading-relaxed mb-3">{m.label}</p>
                  <div className="text-white/35 text-xs">Источник: {m.source}</div>
                </div>
              ))}
            </div>
            <p className="text-white/60 leading-relaxed max-w-4xl">{marketNote}</p>
          </section>

          <section className="mb-20">
            <H2 tag="02 · Проблема">Почему средний бизнес не получает пользы от AI</H2>
            <div className="grid md:grid-cols-2 gap-4">
              {problemPoints.map((p) => (
                <div key={p} className="flex gap-3 bg-red-500/5 border border-red-500/15 rounded-2xl p-5">
                  <Icon name="AlertTriangle" size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="text-white/75 text-sm leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="03 · Решение и бизнес-модель">Воронка, которая превращает аудит в подписку</H2>
            <p className="text-white/60 mb-8 max-w-3xl">
              Позиционирование: <span className="text-white font-semibold">«{investorThesis.positioning}»</span>. Мы продаём
              не разработку, а измеримый экономический результат, и входим в клиента через бесплатную диагностику.
            </p>
            <div className="glass neon-border rounded-3xl overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/10">
                      <th className="p-4 font-normal">Продукт</th>
                      <th className="p-4 font-normal">Цена</th>
                      <th className="p-4 font-normal">Роль в модели</th>
                      <th className="p-4 font-normal">Что получает клиент</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ladderModel.map((l) => (
                      <tr key={l.name} className="border-b border-white/5 last:border-0">
                        <td className="p-4 font-semibold text-white">{l.name}</td>
                        <td className="p-4 text-cyan-300 whitespace-nowrap">{l.price}</td>
                        <td className="p-4 text-white/70">{l.role}</td>
                        <td className="p-4 text-white/55">{l.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="glass neon-border rounded-3xl p-6 md:p-8">
              <h3 className="font-oswald text-2xl font-bold mb-2">Один клиент — не один проект</h3>
              <p className="text-white/50 text-sm mb-6">Типичный путь клиента за 12–18 месяцев</p>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {ltvPath.map((s, i) => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className="bg-white/5 rounded-xl px-4 py-3">
                      <div className="text-white/50 text-xs">{s.step}</div>
                      <div className="font-oswald text-lg text-white">{fmtRub(s.value)} ₽</div>
                    </div>
                    {i < ltvPath.length - 1 && <Icon name="ArrowRight" size={16} className="text-white/30" />}
                  </div>
                ))}
              </div>
              <div className="text-white/70">
                Выручка с клиента: <span className="font-oswald text-2xl gradient-text font-bold">≈ {fmtRub(ltvTotal)} ₽</span>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="04 · Актив">12 собственных AI-продуктов — доказательство и источник выручки</H2>
            <p className="text-white/60 mb-8 max-w-3xl">
              MAT Labs не только говорит про AI, а сама создаёт работающие продукты. Они продаются по подписке, тиражируются
              под брендом партнёров и служат готовыми модулями для внедрений — это снижает себестоимость проектов.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ecosystem.map((e) => (
                <div key={e.name} className="glass border border-white/10 rounded-xl p-4">
                  <div className="font-semibold text-white mb-1">{e.name}</div>
                  <div className="text-white/50 text-xs leading-relaxed">{e.niche}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="05 · Фокус">Три отрасли вместо «всем и всё»</H2>
            <div className="grid md:grid-cols-3 gap-5">
              {verticals.map((v, i) => (
                <div key={v.name} className="glass neon-border rounded-2xl p-6">
                  <div className="font-oswald text-4xl font-bold gradient-text opacity-60 mb-3">0{i + 1}</div>
                  <h3 className="font-oswald text-xl font-bold mb-3">{v.name}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{v.why}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="06 · Привлечение клиентов">Шесть каналов, главный — прямые B2B-продажи</H2>
            <div className="grid md:grid-cols-2 gap-4">
              {channels.map((c) => (
                <div key={c.name} className="glass border border-white/10 rounded-2xl p-5">
                  <div className="font-semibold text-white mb-2">{c.name}</div>
                  <p className="text-white/55 text-sm leading-relaxed">{c.plan}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="07 · Финансовая модель">Прогноз на 2027 год</H2>
            <div className="glass neon-border rounded-3xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/10">
                      <th className="p-4 font-normal">Сценарий</th>
                      <th className="p-4 font-normal">Лиды</th>
                      <th className="p-4 font-normal">Аудиты</th>
                      <th className="p-4 font-normal">Пилоты</th>
                      <th className="p-4 font-normal">Внедрения</th>
                      <th className="p-4 font-normal">Выручка</th>
                      <th className="p-4 font-normal">Валовая прибыль</th>
                      <th className="p-4 font-normal">Подписка в декабре</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s) => (
                      <tr key={s.name} className={`border-b border-white/5 last:border-0 ${s.name === "Базовый" ? "bg-violet-500/10" : ""}`}>
                        <td className="p-4 font-semibold text-white">{s.name}</td>
                        <td className="p-4 text-white/70">{fmtRub(s.leads)}</td>
                        <td className="p-4 text-white/70">{s.audits}</td>
                        <td className="p-4 text-white/70">{s.pilots}</td>
                        <td className="p-4 text-white/70">{s.impls}</td>
                        <td className="p-4 text-cyan-300 font-semibold whitespace-nowrap">{s.revenue.toFixed(1).replace(".", ",")} млн ₽</td>
                        <td className="p-4 text-white/70 whitespace-nowrap">{s.gross.toFixed(1).replace(".", ",")} млн ₽</td>
                        <td className="p-4 text-white/70 whitespace-nowrap">{s.mrr.toFixed(2).replace(".", ",")} млн ₽/мес · {s.clients} кл.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass neon-border rounded-3xl p-6">
                <h3 className="font-oswald text-xl font-bold mb-6">Выручка по кварталам, базовый сценарий</h3>
                <div className="flex items-end gap-4 h-48">
                  {baseQuarters.map((q) => (
                    <div key={q.q} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="text-sm text-white mb-2">{q.revenue.toFixed(1).replace(".", ",")}</div>
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-violet-600 to-cyan-500"
                        style={{ height: `${(q.revenue / maxQ) * 75}%` }}
                      />
                      <div className="text-xs text-white/50 mt-2 text-center">{q.q}</div>
                    </div>
                  ))}
                </div>
                <div className="text-white/35 text-xs mt-3">млн ₽</div>
              </div>
              <div className="glass border border-white/10 rounded-3xl p-6">
                <h3 className="font-oswald text-xl font-bold mb-4">Допущения модели</h3>
                <ul className="space-y-2">
                  {modelAssumptions.map((a) => (
                    <li key={a} className="flex gap-2 text-sm text-white/60">
                      <Icon name="Dot" size={18} className="text-violet-400 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
                <p className="text-white/35 text-xs mt-4 leading-relaxed">
                  Это прогноз, а не гарантия. Модель будет уточнена по фактическим данным первых 90 дней воронки.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="08 · Дорожная карта">Что и когда делаем</H2>
            <div className="space-y-3">
              {roadmap.map((r) => (
                <div key={r.period} className="glass border border-white/10 rounded-2xl p-5 grid md:grid-cols-[180px_220px_1fr] gap-2 md:gap-6 items-center">
                  <div className="text-cyan-300 text-sm font-semibold">{r.period}</div>
                  <div className="font-oswald text-lg text-white">{r.title}</div>
                  <div className="text-white/55 text-sm">{r.result}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="09 · Инвестиции">Запрос: {investmentAsk.amount} {investmentAsk.horizon}</H2>
            <p className="text-white/50 text-sm mb-6">{investmentAsk.note}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {investmentAsk.use.map((u) => (
                <div key={u.item} className="glass neon-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white">{u.item}</span>
                    <span className="font-oswald text-2xl gradient-text font-bold">{u.share}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-cyan-500" style={{ width: `${u.share}%` }} />
                  </div>
                  <p className="text-white/50 text-sm">{u.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <H2 tag="10 · Анализ">SWOT и управление рисками</H2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { t: "Сильные стороны", items: swot.strengths, c: "text-emerald-300 border-emerald-500/20" },
                { t: "Слабые стороны", items: swot.weaknesses, c: "text-amber-300 border-amber-500/20" },
                { t: "Возможности", items: swot.opportunities, c: "text-cyan-300 border-cyan-500/20" },
                { t: "Угрозы", items: swot.threats, c: "text-red-300 border-red-500/20" },
              ].map((b) => (
                <div key={b.t} className={`glass border rounded-2xl p-5 ${b.c.split(" ")[1]}`}>
                  <div className={`font-semibold mb-3 ${b.c.split(" ")[0]}`}>{b.t}</div>
                  <ul className="space-y-1.5">
                    {b.items.map((x) => <li key={x} className="text-sm text-white/65">— {x}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {risks.map((r) => (
                <div key={r.risk} className="grid md:grid-cols-2 gap-2 md:gap-6 glass border border-white/10 rounded-2xl p-5">
                  <div className="flex gap-2 text-white/80 text-sm"><Icon name="ShieldAlert" size={16} className="text-red-400 shrink-0 mt-0.5" />{r.risk}</div>
                  <div className="flex gap-2 text-white/55 text-sm"><Icon name="ShieldCheck" size={16} className="text-emerald-400 shrink-0 mt-0.5" />{r.answer}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <H2 tag="11 · Контроль">Метрики, которые инвестор видит каждый месяц</H2>
            <div className="grid md:grid-cols-2 gap-3 mb-12">
              {kpis.map((k) => (
                <div key={k} className="flex gap-3 items-center bg-white/5 rounded-xl px-4 py-3">
                  <Icon name="BarChart3" size={16} className="text-violet-400 shrink-0" />
                  <span className="text-sm text-white/70">{k}</span>
                </div>
              ))}
            </div>
            <div className="glass neon-border rounded-3xl p-8 md:p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-cyan-600/10 to-violet-600/10" />
              <div className="relative">
                <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-3">Обсудим участие?</h2>
                <p className="text-white/55 mb-8 max-w-xl mx-auto">
                  Покажем продукты вживую, финансовую модель в Excel и текущую воронку продаж.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => contact("bottom")} className="btn-gradient px-8 py-4 rounded-2xl font-semibold text-white flex items-center gap-2">
                    Назначить встречу
                    <Icon name="ArrowRight" size={18} />
                  </button>
                  <a
                    href="/MAT-Labs-strategiya-dlya-investorov.docx"
                    download
                    onClick={() => ymGoal("investor_doc_download")}
                    className="glass border border-white/20 px-8 py-4 rounded-2xl font-semibold text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Icon name="Download" size={18} />
                    Скачать стратегию
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
