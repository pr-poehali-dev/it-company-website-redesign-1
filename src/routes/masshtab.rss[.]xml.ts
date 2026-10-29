import { createFileRoute } from "@tanstack/react-router";
import { M_URL, type Post } from "@/components/masshtab/api";

const SITE = "https://mat-labs.ru";
const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const Route = createFileRoute("/masshtab/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        let posts: Post[] = [];
        try {
          const r = await fetch(`${M_URL}/?action=posts&limit=30`, { signal: AbortSignal.timeout(6000) });
          if (r.ok) posts = (await r.json()).posts || [];
        } catch {
          posts = [];
        }
        const date = (s?: string | null) => new Date(s || Date.now()).toUTCString();
        const items = posts.map((p) => {
          const url = `${SITE}/masshtab/${p.slug}`;
          const img = p.cover_url ? (p.cover_url.startsWith("http") ? p.cover_url : `${SITE}${p.cover_url}`) : "";
          return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date(p.published_at)}</pubDate>
      <category>${esc(p.rubric)}</category>
      <description>${esc(p.lead)}</description>${img ? `\n      <enclosure url="${esc(img)}" type="image/${img.endsWith(".png") ? "png" : "jpeg"}" length="0"/>` : ""}
    </item>`;
        }).join("\n");
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Журнал «Масштаб»</title>
    <link>${SITE}/masshtab</link>
    <description>Бизнес, деньги и люди — проверено цифрами</description>
    <language>ru</language>
    <atom:link href="${SITE}/masshtab/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${date(posts[0]?.published_at)}</lastBuildDate>
${items}
  </channel>
</rss>
`;
        return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
      },
    },
  },
});
