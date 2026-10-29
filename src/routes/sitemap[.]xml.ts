import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://mat-labs.ru";
const RADAR_URL = "https://functions.poehali.dev/87e21a71-588b-4c12-bcd1-82fa1c7a202e";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let parts = 2;
        try {
          const r = await fetch(`${RADAR_URL}/?action=sitemap&part=1`);
          if (r.ok) parts = (await r.json()).parts || parts;
        } catch {
          parts = 2;
        }
        const today = new Date().toISOString().slice(0, 10);
        const maps = ["/sitemap-pages.xml", "/sitemap-blog.xml", "/sitemap-masshtab.xml", ...Array.from({ length: parts }, (_, i) => `/sitemap-radar-${i + 1}.xml`)];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps
          .map(m => `  <sitemap>\n    <loc>${SITE}${m}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`)
          .join("\n")}\n</sitemapindex>\n`;
        return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
