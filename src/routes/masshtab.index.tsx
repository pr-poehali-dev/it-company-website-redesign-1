import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/masshtab/HomePage";
import { mGet, type Market, type Post, type RatingResp } from "@/components/masshtab/api";

const DESC = "«Масштаб» — деловой листок для предпринимателей и руководителей: индикаторы рынка, разборы компаний по данным ФНС, регуляторный дайджест, рейтинг «Масштаб-500», лента ТАСС.";

export const Route = createFileRoute("/masshtab/")({
  loader: async () => {
    const [p, r, m] = await Promise.all([
      mGet<{ posts: Post[] }>({ action: "posts", limit: 13 }), mGet<RatingResp>({ action: "rating" }), mGet<Market>({ action: "market" }),
    ]);
    return { posts: p.data?.posts ?? [], rating: r.data, market: m.data };
  },
  head: () => ({
    meta: [
      { title: "«Масштаб» — бизнес, деньги и люди | деловой листок" }, { name: "description", content: DESC },
      { property: "og:title", content: "«Масштаб» — бизнес, деньги и люди" }, { property: "og:description", content: DESC },
      { property: "og:image", content: "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/1292b992-95e1-4928-b8a9-a0860381b3ea.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://mat-labs.ru/masshtab" }],
  }),
  component: HomePage,
});
