import { useEffect, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import AdSlot, { pickAd } from "./AdSlot";
import LeadForm from "./LeadForm";
import MarketBar from "./MarketBar";
import NewsFeed from "./NewsFeed";
import PostCard from "./PostCard";
import PrintIssuePromo from "./PrintIssuePromo";
import QuoteCard from "./QuoteCard";
import Crumbs from "./Crumbs";
import { RUBRICS } from "./rubrics";
import { companyName, growthLabel, mGet, mln, type Ad, type Market } from "./api";

const route = getRouteApi("/masshtab/");

export default function HomePage() {
  const { posts, rating, market: initMarket, quote } = route.useLoaderData();
  const [ads, setAds] = useState<Ad[]>([]);
  const [market, setMarket] = useState<Market | null>(initMarket);
  useEffect(() => {
    mGet<{ ads: Ad[] }>({ action: "ads" }).then((r) => setAds(r.data?.ads ?? []));
    if (!initMarket) mGet<Market>({ action: "market" }).then((r) => setMarket(r.data));
  }, []);
  const [main, ...rest] = posts;
  const top = rating?.items.slice(0, 7) ?? [];
  const news = market?.news ?? [];
  const lead = news.find((n) => n.desc);

  return (
    <MShell active="/masshtab" top={<MarketBar cbr={market?.cbr ?? null} />}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="pt-4"><Crumbs items={[]} /></div>
        <h1 className="sr-only">«Масштаб» — деловой журнал для предпринимателей и руководителей</h1>
        <div className="mt-4"><AdSlot ad={pickAd(ads, "top")} variant="wide" /></div>

        <div className="grid lg:grid-cols-[260px_1fr_300px] gap-8 mt-8">
          <aside className="order-2 lg:order-1"><NewsFeed items={news} limit={14} title="Лента · экономика" /></aside>

          <div className="order-1 lg:order-2 min-w-0">
            {main ? <PostCard p={main} big /> : lead ? (
              <a href={lead.link} target="_blank" rel="noopener" className="group block bg-white border border-[#e2d9cb] rounded-lg p-6 md:p-8">
                <Kicker>Главное за день · по данным ТАСС</Kicker>
                <h2 className={`${serif} font-bold text-3xl md:text-4xl leading-[1.1] mt-3 group-hover:text-[#d6402b]`}>{lead.title}</h2>
                <p className="text-[#5b5550] mt-3 text-lg">{lead.desc}</p>
                <span className="inline-block mt-4 text-sm font-bold text-[#d6402b]">Читать на tass.ru →</span>
              </a>
            ) : null}

            {rest.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-8 mt-10 pt-8 border-t-2 border-[#14110f]">
                {rest.slice(0, 6).map((p) => <PostCard key={p.id} p={p} />)}
              </div>
            ) : (
              <div className="mt-10 pt-8 border-t-2 border-[#14110f]">
                <Kicker>Рубрики «Масштаба»</Kicker>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5 mt-4">
                  {RUBRICS.map((r) => (
                    <Link key={r.slug} to="/masshtab/rubrika/$rubric" params={{ rubric: r.slug }} className="group">
                      <div className={`${serif} font-bold text-lg group-hover:text-[#d6402b]`}>{r.name}</div>
                      <p className="text-sm text-[#5b5550] mt-0.5">{r.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="order-3 space-y-8">
            <div className="border-2 border-[#14110f] p-5 bg-white">
              <Kicker>Масштаб-500 · 2026</Kicker>
              <div className={`${serif} font-bold text-xl mt-1 leading-tight`}>Самые быстрорастущие компании России</div>
              <div className="mt-3 divide-y divide-[#efe8dc]">
                {top.map((it) => (
                  <div key={it.inn} className="flex items-center gap-3 py-2 text-sm">
                    <b className={`${serif} w-5`}>{it.rank}</b>
                    <span className="flex-1 min-w-0"><span className="block truncate font-semibold">{companyName(it.name).title}</span><span className="text-[11px] text-[#8a8278]">{it.region_name} · {mln(it.rev2025)}</span></span>
                    <b className="text-[#16803c]">{growthLabel(it.growth)}</b>
                  </div>
                ))}
              </div>
              <Link to="/masshtab/500" className="block mt-3 text-sm font-bold text-[#d6402b]">Весь рейтинг и фильтры →</Link>
            </div>
            <AdSlot ad={pickAd(ads, "side")} />
            {rating && (
              <div className="bg-[#efe7da] rounded p-5">
                <Kicker>Цифра выпуска</Kicker>
                <div className={`${serif} font-bold text-5xl mt-1`}>{growthLabel(rating.stats.median)}</div>
                <p className="text-sm text-[#5b5550] mt-1">медианный рост выручки компаний «Масштаб-500» за 2022–2025 годы</p>
                <p className="text-[11px] text-[#8a8278] mt-2">Источник: ФНС, ГИР БО</p>
              </div>
            )}
          </aside>
        </div>

        {quote && <div className="mt-16"><QuoteCard q={quote} /></div>}

        <PrintIssuePromo />

        <section className="mt-16 grid md:grid-cols-2 gap-10 bg-[#14110f] text-white rounded-lg p-6 md:p-10" id="hero">
          <div>
            <Kicker className="text-[#ff7a66]">Люди и роли</Kicker>
            <h2 className={`${serif} font-bold text-3xl md:text-4xl mt-2 leading-tight`}>Расскажите, какие решения сработали</h2>
            <p className="text-white/70 mt-4">Нас интересуют не биографии, а решения: как выбирали стратегию, сокращали издержки, выходили на новые рынки. Каждую историю дополняем цифрами из отчётности компании.</p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li>— Для компаний из «Масштаб-500» — бесплатно</li>
              <li>— Текст согласуем до публикации</li>
              <li>— Карточка компании с данными ФНС в материале</li>
            </ul>
          </div>
          <div className="bg-[#f6f2ea] text-[#14110f] rounded-lg p-5">
            <LeadForm kind="hero" cta="Предложить интервью" placeholder="Компания, ваша роль и какое решение хотите разобрать" />
          </div>
        </section>
      </div>
    </MShell>
  );
}
