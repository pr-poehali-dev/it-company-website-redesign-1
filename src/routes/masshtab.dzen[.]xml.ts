import { createFileRoute } from "@tanstack/react-router";
import { M_URL } from "@/components/masshtab/api";

const SITE = "https://mat-labs.ru";

export const Route = createFileRoute("/masshtab/dzen.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { dzenItem } = await import("@/lib/dzen.server");
        let posts: import("@/lib/dzen.server").FeedPost[] = [];
        try {
          const r = await fetch(`${M_URL}/?action=feed&limit=30`, { signal: AbortSignal.timeout(8000) });
          if (r.ok) posts = (await r.json()).posts || [];
        } catch {
          posts = [];
        }
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:georss="http://www.georss.org/georss">
  <channel>
    <title>Журнал «Масштаб»</title>
    <link>${SITE}/masshtab</link>
    <description>Бизнес, деньги и люди — проверено цифрами. Деловой журнал для предпринимателей и руководителей.</description>
    <language>ru</language>
    <atom:link href="${SITE}/masshtab/dzen.xml" rel="self" type="application/rss+xml"/>
${posts.map(dzenItem).join("\n")}
  </channel>
</rss>
`;
        return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
      },
    },
  },
});
