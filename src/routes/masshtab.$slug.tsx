import { createFileRoute, notFound } from "@tanstack/react-router";
import PostPage from "@/components/masshtab/PostPage";
import { mGet, type FullPost } from "@/components/masshtab/api";
import { rubricByName } from "@/components/masshtab/rubrics";
import { PUBLISHER, SITE, abs, breadcrumbLd, clip, ld, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/$slug")({
  loader: async ({ params }) => {
    if (!/^[a-z0-9-]{2,200}$/.test(params.slug)) throw notFound();
    const { status, data } = await mGet<{ post: FullPost }>({ action: "post", slug: params.slug });
    if (status === 404 || (status === 200 && !data?.post)) throw notFound();
    if (!data?.post) throw new Error("Журнал временно недоступен");
    return { post: data.post };
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.post;
    const path = `/masshtab/${params.slug}`;
    if (!p) return pageMeta({ title: "«Масштаб»", description: "Деловой журнал «Масштаб»", path });
    const r = rubricByName(p.rubric);
    const desc = clip(p.lead || p.content, 160);
    const title = clip(p.title, 68);
    const base = pageMeta({ title: `${title} | «Масштаб»`, description: desc, path, image: p.cover_url ?? undefined, type: "article" });
    const words = (p.content || "").split(/\s+/).length;
    const crumbs = [...(r ? [{ label: r.name, to: `/masshtab/rubrika/${r.slug}` }] : []), { label: p.title }];
    return {
      meta: [
        ...base.meta,
        { property: "article:published_time", content: p.published_at ?? p.created_at },
        { property: "article:section", content: p.rubric },
        ...(p.hero_name ? [{ property: "article:tag", content: p.hero_name }] : []),
      ],
      links: base.links,
      scripts: [
        ld({
          "@context": "https://schema.org", "@type": p.kind === "interview" ? "NewsArticle" : "Article",
          headline: clip(p.title, 110), description: desc, image: abs(p.cover_url) ? [abs(p.cover_url)] : undefined,
          datePublished: p.published_at ?? p.created_at, dateModified: p.published_at ?? p.created_at,
          author: { "@type": "Organization", name: p.author || "Редакция «Масштаба»", url: `${SITE}/masshtab/o-zhurnale` },
          publisher: PUBLISHER, mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${path}` },
          articleSection: p.rubric, wordCount: words, inLanguage: "ru-RU",
          ...(p.kind === "partner" ? { sponsor: { "@type": "Organization", name: "Партнёр" } } : {}),
          ...(p.sources ? { citation: p.sources.split("\n").map((s) => s.trim()).filter(Boolean) } : {}),
          ...(p.company ? { about: { "@type": "Organization", name: p.company.name, taxID: p.company.inn } } : {}),
        }),
        breadcrumbLd(crumbs.map((c, i) => (i === crumbs.length - 1 ? { label: c.label } : c))),
      ],
    };
  },
  component: PostPage,
});
