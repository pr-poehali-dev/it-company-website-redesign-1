import { createFileRoute } from "@tanstack/react-router";
import { M_URL, type Post } from "@/components/masshtab/api";
import { RUBRICS } from "@/components/masshtab/rubrics";

const SITE = "https://mat-labs.ru";

export const Route = createFileRoute("/sitemap-masshtab.xml")({
  server: {
    handlers: {
      GET: async () => {
        let posts: Post[] = [];
        try {
          const r = await fetch(`${M_URL}/?action=posts&limit=50`, { signal: AbortSignal.timeout(6000) });
          if (r.ok) posts = (await r.json()).posts || [];
        } catch {
          posts = [];
        }
        const day = (s?: string | null) => (s || "").slice(0, 10);
        const last = day(posts[0]?.published_at) || new Date().toISOString().slice(0, 10);
        const used = new Set(posts.map((p) => p.rubric));
        const urls: [string, string, string, string][] = [
          ["/masshtab", last, "daily", "0.9"],
          ["/masshtab/500", last, "monthly", "0.9"],
          ["/masshtab/pechatnyy-nomer", last, "monthly", "0.7"],
          ["/masshtab/obuchenie", last, "daily", "0.8"],
          ["/masshtab/citata-dnya", new Date().toISOString().slice(0, 10), "daily", "0.5"],
          ["/masshtab/o-zhurnale", "", "monthly", "0.4"],
          ["/masshtab/reklama", "", "monthly", "0.4"],
          ...RUBRICS.filter((r) => used.has(r.name)).map((r): [string, string, string, string] => [
            `/masshtab/rubrika/${r.slug}`, day(posts.find((p) => p.rubric === r.name)?.published_at), "weekly", "0.6"]),
          ...posts.map((p): [string, string, string, string] => [`/masshtab/${p.slug}`, day(p.published_at), "monthly", "0.8"]),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map(([u, d, f, pr]) => `  <url>\n    <loc>${SITE}${u}</loc>\n${d ? `    <lastmod>${d}</lastmod>\n` : ""}    <changefreq>${f}</changefreq>\n    <priority>${pr}</priority>\n  </url>`)
          .join("\n")}\n</urlset>\n`;
        return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
      },
    },
  },
});
