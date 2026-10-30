import { createFileRoute } from "@tanstack/react-router";
import LearnPage from "@/components/masshtab/LearnPage";
import { lGet, type LearnPost, type Track } from "@/components/masshtab/api";
import { SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

const DESC = "Обучение для руководителей и собственников: разборы управленческих ситуаций на цифрах — команда и найм, финансы, стратегия, продажи, процессы и личная эффективность. Новый кейс каждый день.";

export const Route = createFileRoute("/masshtab/obuchenie")({
  validateSearch: (s: Record<string, unknown>): { t?: string } => (typeof s.t === "string" && /^[a-z-]{2,40}$/.test(s.t) ? { t: s.t } : {}),
  loader: async () => {
    const [t, p] = await Promise.all([lGet<{ tracks: Track[] }>({ action: "tracks" }), lGet<{ posts: LearnPost[] }>({ action: "list", limit: 60 })]);
    return { tracks: t.data?.tracks ?? [], posts: p.data?.posts ?? [] };
  },
  head: ({ loaderData }) => {
    const posts = loaderData?.posts ?? [];
    return {
      ...pageMeta({ title: "Обучение для руководителей: кейсы и разборы | «Масштаб»", description: DESC, path: "/masshtab/obuchenie", image: posts[0]?.cover_url ?? undefined }),
      scripts: [
        ld({
          "@context": "https://schema.org", "@type": "CollectionPage", name: "Школа руководителя — журнал «Масштаб»", description: DESC, url: `${SITE}/masshtab/obuchenie`,
          mainEntity: { "@type": "ItemList", itemListElement: posts.slice(0, 20).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/masshtab/${p.slug}`, name: p.title })) },
        }),
        breadcrumbLd([{ label: "Обучение" }]),
      ],
    };
  },
  component: LearnPage,
});
