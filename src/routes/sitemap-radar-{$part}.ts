import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://mat-labs.ru";
const RADAR_URL = "https://functions.poehali.dev/87e21a71-588b-4c12-bcd1-82fa1c7a202e";

export const Route = createFileRoute("/sitemap-radar-{$part}")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const part = Number(params.part);
        if (!Number.isInteger(part) || part < 1 || part > 50) return new Response("Not found", { status: 404 });
        const r = await fetch(`${RADAR_URL}/?action=sitemap&part=${part}`).catch(() => null);
        if (!r || !r.ok) return new Response("Temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
        const data: { items: [string, string][] } = await r.json();
        if (!data.items?.length) return new Response("Not found", { status: 404 });
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${data.items
          .map(([inn, d]) => `  <url>\n    <loc>${SITE}/radar/${inn}</loc>\n${d ? `    <lastmod>${d}</lastmod>\n` : ""}    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`)
          .join("\n")}\n</urlset>\n`;
        return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=21600" } });
      },
    },
  },
});
