export const SITE = "https://mat-labs.ru";
export const PUBLISHER = {
  "@type": "Organization",
  name: "Журнал «Масштаб» (ООО «МАТ-Лабс»)",
  url: `${SITE}/masshtab`,
  logo: { "@type": "ImageObject", url: "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/bucket/445e832b-e1ed-413e-a842-7a510d6d41f1.jpg" },
};

export const abs = (u: string | null | undefined) => (!u ? undefined : u.startsWith("http") ? u : `${SITE}${u}`);
export const ld = (data: object) => ({ type: "application/ld+json", children: JSON.stringify(data) });

export const clip = (s: string, n = 160) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/[\s,.;:—-]+\S*$/, "")}…`;
};

export interface Crumb { label: string; to?: string }

export function breadcrumbLd(items: Crumb[]) {
  const all = [{ label: "Главная", to: "/" }, { label: "Журнал «Масштаб»", to: "/masshtab" }, ...items];
  return ld({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.to ? { item: `${SITE}${c.to === "/" ? "/" : c.to}` } : {}) })),
  });
}

export function pageMeta({ title, description, path, image, type = "website" }: { title: string; description: string; path: string; image?: string; type?: string }) {
  const url = `${SITE}${path}`;
  const img = abs(image) ?? "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/1292b992-95e1-4928-b8a9-a0860381b3ea.jpg";
  return {
    meta: [
      { title }, { name: "description", content: description },
      { property: "og:type", content: type }, { property: "og:site_name", content: "Журнал «Масштаб»" },
      { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:url", content: url },
      { property: "og:image", content: img }, { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: title },
      { name: "twitter:description", content: description }, { name: "twitter:image", content: img },
    ],
    links: [{ rel: "canonical", href: url }, { rel: "alternate", type: "application/rss+xml", title: "Журнал «Масштаб»", href: `${SITE}/masshtab/rss.xml` }],
  };
}
