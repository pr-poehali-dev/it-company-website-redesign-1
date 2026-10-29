import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/masshtab/HomePage";
import { mGet, type Post, type RatingResp } from "@/components/masshtab/api";

const DESC = "Деловой листок «Масштаб»: интервью с предпринимателями, рейтинг «Масштаб-500» самых быстрорастущих компаний России по данным ФНС.";

export const Route = createFileRoute("/masshtab/")({
  loader: async () => {
    const [p, r] = await Promise.all([mGet<{ posts: Post[] }>({ action: "posts", limit: 13 }), mGet<RatingResp>({ action: "rating" })]);
    return { posts: p.data?.posts ?? [], rating: r.data };
  },
  head: () => ({
    meta: [
      { title: "«Масштаб» — бизнес, деньги и люди | деловой информационный листок" }, { name: "description", content: DESC },
      { property: "og:title", content: "«Масштаб» — бизнес, деньги и люди" }, { property: "og:description", content: DESC },
      { property: "og:image", content: "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/79a66d6b-7891-4014-b650-1f7f2e33b9f7.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://mat-labs.ru/masshtab" }],
  }),
  component: HomePage,
});
