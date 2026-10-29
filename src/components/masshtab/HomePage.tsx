import { useEffect, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import AdSlot, { pickAd } from "./AdSlot";
import LeadForm from "./LeadForm";
import { companyName, fmtDate, growthLabel, mGet, mln, type Ad } from "./api";

const route = getRouteApi("/masshtab/");
const HERO_IMG = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/79a66d6b-7891-4014-b650-1f7f2e33b9f7.jpg";

export default function HomePage() {
  const { posts, rating } = route.useLoaderData();
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => { mGet<{ ads: Ad[] }>({ action: "ads" }).then((r) => setAds(r.data?.ads ?? [])); }, []);
  const [main, ...rest] = posts;
  const top = rating?.items.slice(0, 7) ?? [];

  return (
    <MShell active="/masshtab">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="py-3 border-b border-[#e2d9cb] text-xs text-[#8a8278] flex justify-between">
          <span>Деловой информационный листок</span><span className="hidden sm:inline">Бизнес, деньги и люди — проверено цифрами</span>
        </div>
        <div className="mt-6"><AdSlot ad={pickAd(ads, "top")} variant="wide" /></div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-10 mt-8">
          <div>
            {main ? (
              <Link to="/masshtab/$slug" params={{ slug: main.slug }} className="block group">
                <img src={main.cover_url || HERO_IMG} alt={main.hero_name || main.title} className="w-full aspect-[16/9] object-cover rounded" />
                <Kicker className="mt-4">{main.kind === "interview" ? "Интервью" : main.rubric}{main.kind === "partner" ? " · партнёрский материал" : ""}</Kicker>
                <h1 className={`${serif} font-bold text-3xl md:text-5xl leading-[1.08] mt-2 group-hover:text-[#d6402b] transition-colors`}>{main.title}</h1>
                {main.lead && <p className="text-lg text-[#5b5550] mt-3 leading-relaxed">{main.lead}</p>}
                <div className="text-xs text-[#8a8278] mt-3">{main.hero_name && <b className="text-[#14110f]">{main.hero_name}</b>}{main.hero_role ? `, ${main.hero_role}` : ""} · {fmtDate(main.published_at)} · {main.read_min} мин</div>
              </Link>
            ) : (
              <div className="relative rounded overflow-hidden">
                <img src={HERO_IMG} alt="" className="w-full aspect-[16/9] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14110f] via-[#14110f]/40 to-transparent flex flex-col justify-end p-6 md:p-10 text-white">
                  <Kicker className="text-[#ff7a66]">Интервью · скоро</Kicker>
                  <h1 className={`${serif} font-bold text-3xl md:text-5xl leading-[1.08] mt-2`}>Истории тех, кто растёт быстрее рынка</h1>
                  <p className="text-white/80 mt-3 max-w-xl">Первые интервью с основателями компаний из рейтинга «Масштаб-500» готовятся к публикации.</p>
                  <Link to="/masshtab/reklama" hash="hero" className="self-start mt-5 bg-[#d6402b] text-white font-bold px-5 py-2.5 rounded">Предложить героя</Link>
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-8 mt-10 pt-8 border-t-2 border-[#14110f]">
                {rest.slice(0, 6).map((p) => (
                  <Link key={p.id} to="/masshtab/$slug" params={{ slug: p.slug }} className="group">
                    {p.cover_url && <img src={p.cover_url} alt={p.title} className="w-full aspect-[3/2] object-cover rounded mb-3" />}
                    <Kicker>{p.kind === "interview" ? "Интервью" : p.rubric}</Kicker>
                    <h3 className={`${serif} font-bold text-xl leading-snug mt-1.5 group-hover:text-[#d6402b]`}>{p.title}</h3>
                    {p.lead && <p className="text-sm text-[#5b5550] mt-2 line-clamp-3">{p.lead}</p>}
                    <div className="text-xs text-[#8a8278] mt-2">{fmtDate(p.published_at)} · {p.read_min} мин</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <div className="border-2 border-[#14110f] p-5 bg-white">
              <Kicker>Масштаб-500 · 2026</Kicker>
              <div className={`${serif} font-bold text-2xl mt-1 leading-tight`}>Самые быстрорастущие компании России</div>
              <div className="mt-4 divide-y divide-[#efe8dc]">
                {top.map((it) => (
                  <div key={it.inn} className="flex items-center gap-3 py-2 text-sm">
                    <b className={`${serif} w-6 text-lg`}>{it.rank}</b>
                    <span className="flex-1 min-w-0"><span className="block truncate font-semibold">{companyName(it.name).title}</span><span className="text-[11px] text-[#8a8278]">{it.region_name} · {mln(it.rev2025)}</span></span>
                    <b className="text-[#16803c]">{growthLabel(it.growth)}</b>
                  </div>
                ))}
              </div>
              <Link to="/masshtab/500" className="block mt-4 text-sm font-bold text-[#d6402b]">Весь рейтинг и фильтры по регионам →</Link>
            </div>
            <AdSlot ad={pickAd(ads, "side")} />
            {rating && (
              <div className="bg-[#efe7da] rounded p-5">
                <Kicker>Цифра выпуска</Kicker>
                <div className={`${serif} font-bold text-5xl mt-1`}>{growthLabel(rating.stats.median)}</div>
                <p className="text-sm text-[#5b5550] mt-1">медианный рост выручки компаний «Масштаб-500» за 2022–2025 годы</p>
              </div>
            )}
          </aside>
        </div>

        <section className="mt-16 grid md:grid-cols-2 gap-10 bg-[#14110f] text-white rounded-lg p-6 md:p-10" id="hero">
          <div>
            <Kicker className="text-[#ff7a66]">Для предпринимателей</Kicker>
            <h2 className={`${serif} font-bold text-3xl md:text-4xl mt-2 leading-tight`}>Расскажите историю своего бизнеса</h2>
            <p className="text-white/70 mt-4">Мы публикуем интервью с основателями и руководителями: как начинали, на чём выросли, какие ошибки совершили. Каждую историю дополняем цифрами из отчётности компании.</p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li>— Для компаний из рейтинга «Масштаб-500» — бесплатно</li>
              <li>— Журналист готовит текст, вы согласуете его до выхода</li>
              <li>— Ссылка на компанию и карточка с цифрами в материале</li>
            </ul>
          </div>
          <div className="bg-[#f6f2ea] text-[#14110f] rounded-lg p-5">
            <LeadForm kind="hero" cta="Предложить интервью" placeholder="Коротко о компании и о чём хотите рассказать" />
          </div>
        </section>
      </div>
    </MShell>
  );
}
