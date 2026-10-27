import { Helmet } from "@/lib/helmet";

const ORG = { "@type": "Organization", name: "МАТ-Лабс", url: "https://mat-labs.ru" };

export function FaqSchema({ items }: { items: [string, string][] }) {
  if (!items.length) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return <Helmet><script type="application/ld+json">{JSON.stringify(data)}</script></Helmet>;
}

export function ServiceSchema({ name, description, url, priceFrom, category }: { name: string; description: string; url: string; priceFrom?: number; category?: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url,
    serviceType: category || name,
    provider: ORG,
    areaServed: { "@type": "Country", name: "Россия" },
    ...(priceFrom ? { offers: { "@type": "Offer", priceCurrency: "RUB", price: priceFrom, priceSpecification: { "@type": "PriceSpecification", minPrice: priceFrom, priceCurrency: "RUB" }, url } } : {}),
  };
  return <Helmet><script type="application/ld+json">{JSON.stringify(data)}</script></Helmet>;
}

export function ItemListSchema({ name, items }: { name: string; items: { name: string; url: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: it.url })),
  };
  return <Helmet><script type="application/ld+json">{JSON.stringify(data)}</script></Helmet>;
}

export function DatasetSchema({ name, description, url }: { name: string; description: string; url: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url,
    creator: ORG,
    license: "https://www.nalog.gov.ru/opendata/",
    isBasedOn: "https://www.nalog.gov.ru/opendata/",
    temporalCoverage: "2025",
    spatialCoverage: { "@type": "Place", name: "Россия" },
  };
  return <Helmet><script type="application/ld+json">{JSON.stringify(data)}</script></Helmet>;
}