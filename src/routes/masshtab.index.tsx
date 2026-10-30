import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/masshtab/HomePage";
import { mGet, type Market, type Post, type QuoteResp, type RatingResp } from "@/components/masshtab/api";
import { PUBLISHER, SITE, abs, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

const DESC = "Деловой листок «Масштаб» для предпринимателей и руководителей: индикаторы рынка, регуляторный дайджест, разборы компаний по данным ФНС, рейтинг «Масштаб-500».";

export const Route = createFileRoute("/masshtab/")({
  loader: async () => {
    const [p, r, m, q] = await Promise.all([
      mGet<{ posts: Post[] }>({ action: "posts", limit: 13 }), mGet<RatingResp>({ action: "rating" }), mGet<Market>({ action: "market" }),
      mGet<QuoteResp>({ action: "quote" }),
    ]);
    return { posts: p.data?.posts ?? [], rating: r.data, market: m.data, quote: q.data?.quote ?? null };
  },
  head: ({ loaderData }) => {
    const posts = loaderData?.posts ?? [];
    return {
      ...pageMeta({ title: "«Масштаб» — бизнес, деньги и люди | деловой журнал", description: DESC, path: "/masshtab" }),
      scripts: [
        ld({ "@context": "https://schema.org", ...PUBLISHER, "@type": "NewsMediaOrganization", description: DESC, publishingPrinciples: `${SITE}/masshtab/o-zhurnale` }),
        ld({ "@context": "https://schema.org", "@type": "WebSite", name: "Журнал «Масштаб»", url: `${SITE}/masshtab`, inLanguage: "ru-RU", publisher: PUBLISHER }),
        ...(posts.length ? [ld({
          "@context": "https://schema.org", "@type": "ItemList", name: "Свежие материалы «Масштаба»",
          itemListElement: posts.slice(0, 10).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/masshtab/${p.slug}`, name: p.title, image: abs(p.cover_url) })),
        })] : []),
        breadcrumbLd([]),
      ],
    };
  },
  component: HomePage,
});
