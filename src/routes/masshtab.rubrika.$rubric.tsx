import { createFileRoute, notFound } from "@tanstack/react-router";
import RubricPage from "@/components/masshtab/RubricPage";
import { mGet, type Post } from "@/components/masshtab/api";
import { rubricBySlug } from "@/components/masshtab/rubrics";

export const Route = createFileRoute("/masshtab/rubrika/$rubric")({
  loader: async ({ params }) => {
    const r = rubricBySlug(params.rubric);
    if (!r) throw notFound();
    const { data } = await mGet<{ posts: Post[] }>({ action: "posts", rubric: r.name, limit: 30 });
    return { posts: data?.posts ?? [] };
  },
  head: ({ params }) => {
    const r = rubricBySlug(params.rubric);
    const title = r ? `${r.name} — рубрика журнала «Масштаб»` : "«Масштаб»";
    return {
      meta: [{ title }, { name: "description", content: r?.desc ?? "" }, { property: "og:title", content: title }, { property: "og:description", content: r?.desc ?? "" }],
      links: [{ rel: "canonical", href: `https://mat-labs.ru/masshtab/rubrika/${params.rubric}` }],
    };
  },
  component: RubricPage,
});
