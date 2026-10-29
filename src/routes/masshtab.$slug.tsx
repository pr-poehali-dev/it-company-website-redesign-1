import { createFileRoute, notFound } from "@tanstack/react-router";
import PostPage from "@/components/masshtab/PostPage";
import { mGet, type FullPost } from "@/components/masshtab/api";

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
    const title = p ? `${p.title} | «Масштаб»` : "«Масштаб»";
    const desc = p?.lead || "Интервью и истории бизнеса в деловом листке «Масштаб».";
    return {
      meta: [
        { title }, { name: "description", content: desc }, { property: "og:type", content: "article" },
        { property: "og:title", content: p?.title || "«Масштаб»" }, { property: "og:description", content: desc },
        ...(p?.cover_url ? [{ property: "og:image", content: p.cover_url }] : []),
      ],
      links: [{ rel: "canonical", href: `https://mat-labs.ru/masshtab/${params.slug}` }],
    };
  },
  component: PostPage,
});
