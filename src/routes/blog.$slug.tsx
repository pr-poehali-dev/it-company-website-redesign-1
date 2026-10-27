import { createFileRoute, notFound } from "@tanstack/react-router";
import BlogPage from "@/pages/BlogPage";
import { findPostBySlug } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { post, reachable } = await findPostBySlug(params.slug);
    if (!post && reachable) throw notFound();
    return { post };
  },
  component: BlogPage,
});
