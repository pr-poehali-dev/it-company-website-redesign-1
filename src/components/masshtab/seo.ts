export const SITE = "https://mat-labs.ru";
export const PUBLISHER = {
  "@type": "Organization",
  name: "Журнал «Масштаб» (ООО «МАТ-Лабс»)",
  url: `${SITE}/masshtab`,
  logo: { "@type": "ImageObject", url: "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/bucket/07ec190d-cb1c-4740-9420-330877ac946b.jpg" },
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

export interface OfferItem { name: string; price: number; description?: string; unit?: string }

export function serviceLd({ name, description, path, offers, serviceType }: { name: string; description: string; path: string; offers: OfferItem[]; serviceType: string }) {
  return ld({
    "@context": "https://schema.org",
    "@type": "Service",
    name, description, serviceType,
    url: `${SITE}${path}`,
    provider: PUBLISHER,
    areaServed: { "@type": "Country", name: "Россия" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name,
      itemListElement: offers.map((o) => ({
        "@type": "Offer",
        name: o.name,
        ...(o.description ? { description: o.description } : {}),
        url: `${SITE}${path}`,
        priceCurrency: "RUB",
        ...(o.unit
          ? { priceSpecification: { "@type": "UnitPriceSpecification", price: o.price, priceCurrency: "RUB", unitText: o.unit } }
          : { price: o.price, priceSpecification: { "@type": "PriceSpecification", minPrice: o.price, priceCurrency: "RUB" } }),
      })),
    },
  });
}

export function calcLd({ name, description, path }: { name: string; description: string; path: string }) {
  return ld({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name, description,
    url: `${SITE}${path}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    inLanguage: "ru",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "RUB" },
    publisher: PUBLISHER,
  });
}
