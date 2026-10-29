import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import AdSlot, { pickAd } from "./AdSlot";
import NewsFeed from "./NewsFeed";
import PostCard from "./PostCard";
import LeadForm from "./LeadForm";
import Crumbs from "./Crumbs";
import { mGet, type Ad, type Market } from "./api";
import { rubricBySlug } from "./rubrics";

const route = getRouteApi("/masshtab/rubrika/$rubric");

export default function RubricPage() {
  const { posts } = route.useLoaderData();
  const { rubric } = route.useParams();
  const r = rubricBySlug(rubric)!;
  const [ads, setAds] = useState<Ad[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  useEffect(() => {
    mGet<{ ads: Ad[] }>({ action: "ads" }).then((x) => setAds(x.data?.ads ?? []));
    if (r.slug === "indikatory" || r.slug === "regulyator") mGet<Market>({ action: "market" }).then((x) => setMarket(x.data));
  }, [r.slug]);

  return (
    <MShell active={r.slug}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <Crumbs items={[{ label: r.name }]} />
        <Kicker className="mt-6">{r.tier === "core" ? "Аналитика" : "Практика"} · {r.rhythm}</Kicker>
        <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-2`}>{r.name}</h1>
        <p className="text-lg text-[#5b5550] mt-3 max-w-2xl">{r.desc}</p>
        <p className="text-sm text-[#8a8278] mt-2">Формат: {r.format}</p>

        <div className="grid lg:grid-cols-[1fr_300px] gap-10 mt-10 pt-8 border-t-2 border-[#14110f]">
          <div>
            {posts.length ? (
              <div className="grid sm:grid-cols-2 gap-8">{posts.map((p) => <PostCard key={p.id} p={p} />)}</div>
            ) : (
              <div className="bg-white border border-[#e2d9cb] rounded-lg p-8">
                <div className={`${serif} font-bold text-2xl`}>Первые материалы рубрики готовятся</div>
                <p className="text-[#5b5550] mt-2">Хотите, чтобы редакция разобрала вашу компанию, сделку или инструмент? Напишите нам.</p>
                <div className="mt-6 max-w-lg"><LeadForm kind="hero" cta="Предложить тему" placeholder={`Тема для рубрики «${r.name}»`} /></div>
              </div>
            )}
          </div>
          <aside className="space-y-8">
            {market && <NewsFeed items={market.news} limit={8} title="По теме · ТАСС" />}
            <AdSlot ad={pickAd(ads, "side")} />
          </aside>
        </div>
      </div>
    </MShell>
  );
}
