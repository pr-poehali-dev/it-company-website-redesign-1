import { createFileRoute, notFound } from "@tanstack/react-router";
import RubricPage from "@/components/masshtab/RubricPage";
import { mGet, type Post } from "@/components/masshtab/api";
import { rubricBySlug } from "@/components/masshtab/rubrics";
import { SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/rubrika/$rubric")({
  loader: async ({ params }) => {
    const r = rubricBySlug(params.rubric);
    if (!r) throw notFound();
    const { data } = await mGet<{ posts: Post[] }>({ action: "posts", rubric: r.name, limit: 30 });
    return { posts: data?.posts ?? [] };
  },
  head: ({ params, loaderData }) => {
    const r = rubricBySlug(params.rubric);
    const path = `/masshtab/rubrika/${params.rubric}`;
    if (!r) return pageMeta({ title: "«Масштаб»", description: "", path });
    const posts = loaderData?.posts ?? [];
    const base = pageMeta({ title: `${r.name} — рубрика журнала «Масштаб»`, description: `${r.desc} Выходит ${r.rhythm}.`, path });
    return {
      ...base,
      meta: posts.length ? base.meta : [...base.meta, { name: "robots", content: "noindex, follow" }],
      scripts: [
        ld({
          "@context": "https://schema.org", "@type": "CollectionPage", name: r.name, description: r.desc, url: `${SITE}${path}`,
          mainEntity: { "@type": "ItemList", itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/masshtab/${p.slug}`, name: p.title })) },
        }),
        breadcrumbLd([{ label: r.name }]),
      ],
    };
  },
  component: RubricPage,
});
