import { createFileRoute } from "@tanstack/react-router";
import { BLOG_URL, BUNDLED_POSTS } from "@/lib/blog";
import { generateSlug } from "@/lib/slug";
import type { BlogPost } from "@/components/BlogModal";

const SITE = "https://mat-labs.ru";

export const Route = createFileRoute("/sitemap-blog")({
  server: {
    handlers: {
      GET: async () => {
        let posts: BlogPost[] = BUNDLED_POSTS;
        try {
          const r = await fetch(`${BLOG_URL}/`, { signal: AbortSignal.timeout(6000) });
          if (r.ok) {
            const live: BlogPost[] = (await r.json()).posts || [];
            const seen = new Set(live.map(p => generateSlug(p.title)));
            posts = [...live, ...BUNDLED_POSTS.filter(p => !seen.has(generateSlug(p.title)))];
          }
        } catch {
          posts = BUNDLED_POSTS;
        }
        const urls = new Map<string, string>();
        posts.forEach(p => {
          const slug = generateSlug(p.title);
          if (!slug || p.source_url) return;
          urls.set(slug, (p.created_at || "").slice(0, 10));
        });
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(urls.entries())
          .map(([slug, d]) => `  <url>\n    <loc>${SITE}/blog/${slug}</loc>\n${d ? `    <lastmod>${d}</lastmod>\n` : ""}    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`)
          .join("\n")}\n</urlset>\n`;
        return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});