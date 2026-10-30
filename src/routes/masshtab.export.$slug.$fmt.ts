import { createFileRoute } from "@tanstack/react-router";
import { M_URL, type FullPost } from "@/components/masshtab/api";

const TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: "text/html; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

const fail = (status: number, text: string) =>
  new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export const Route = createFileRoute("/masshtab/export/$slug/$fmt")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const fmt = String(params.fmt || "").toLowerCase();
        const slug = String(params.slug || "");
        if (!TYPES[fmt]) return fail(404, "Формат не поддерживается");
        if (!/^[a-z0-9-]{2,200}$/.test(slug)) return fail(404, "Статья не найдена");
        let post: FullPost | null = null;
        try {
          const r = await fetch(`${M_URL}/?action=post&slug=${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(9000) });
          if (r.status === 404) return fail(404, "Статья не найдена");
          if (r.ok) post = (await r.json()).post ?? null;
        } catch {
          post = null;
        }
        if (!post) return fail(503, "Журнал временно недоступен, попробуйте через минуту");
        const x = await import("@/components/masshtab/exportArticle");
        const name = `masshtab-${slug.slice(0, 60)}.${fmt}`;
        let body: string | Uint8Array;
        if (fmt === "docx") body = await x.toDocx(post, new URL(request.url).origin);
        else if (fmt === "html") body = x.toHtml(post);
        else if (fmt === "md") body = x.toMarkdown(post);
        else body = x.toText(post);
        return new Response(body as BodyInit, {
          headers: {
            "Content-Type": TYPES[fmt],
            "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
            "Cache-Control": "public, max-age=600",
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
});
