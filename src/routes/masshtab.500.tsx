import { createFileRoute } from "@tanstack/react-router";
import RatingPage from "@/components/masshtab/RatingPage";
import { mGet, type Filters, type RatingResp } from "@/components/masshtab/api";
import { PUBLISHER, SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

type Search = { region?: number; section?: string; q?: string };

export const regionCode = (r?: number) => (r ? String(r).padStart(2, "0") : undefined);

const TITLE = "Масштаб-500 — самые быстрорастущие компании России 2026 | журнал «Масштаб»";
const DESC = "Рейтинг 500 самых быстрорастущих компаний России по выручке за 2022–2025 годы по данным ФНС. Фильтры по региону и отрасли.";

export const Route = createFileRoute("/masshtab/500")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    region: /^\d{1,2}$/.test(String(s.region ?? "")) && Number(s.region) > 0 ? Number(s.region) : undefined,
    section: typeof s.section === "string" && s.section.length < 60 ? s.section : undefined,
    q: typeof s.q === "string" && s.q.trim() ? s.q.slice(0, 80) : undefined,
  }),
  loaderDeps: ({ search }) => ({ region: search.region, section: search.section }),
  loader: async ({ deps }) => {
    const [r, f] = await Promise.all([
      mGet<RatingResp>({ action: "rating", region: regionCode(deps.region), section: deps.section }),
      mGet<Filters>({ action: "filters" }),
    ]);
    return { rating: r.data, filters: f.data };
  },
  head: ({ loaderData, match }) => {
    const sp = match.search as Search;
    const regionName = loaderData?.filters?.regions.find((r) => r.code === regionCode(sp.region))?.name;
    const scope = [regionName, sp.section].filter(Boolean).join(", ");
    const filtered = Boolean(sp.region || sp.section || sp.q);
    const title = scope ? `Масштаб-500: быстрорастущие компании — ${scope}` : TITLE;
    const desc = scope ? `Самые быстрорастущие компании (${scope}) по выручке за 2022–2025 годы по данным ФНС. Рейтинг журнала «Масштаб».` : DESC;
    const base = pageMeta({ title, description: desc, path: "/masshtab/500" });
    const items = loaderData?.rating?.items ?? [];
    return {
      meta: filtered ? [...base.meta, { name: "robots", content: "noindex, follow" }] : base.meta,
      links: base.links,
      scripts: [
        ld({
          "@context": "https://schema.org", "@type": "Dataset", name: "Масштаб-500 — самые быстрорастущие компании России", description: DESC,
          url: `${SITE}/masshtab/500`, creator: PUBLISHER, isBasedOn: "https://bo.nalog.gov.ru/", temporalCoverage: "2022/2025",
          spatialCoverage: { "@type": "Place", name: "Россия" }, license: "https://www.nalog.gov.ru/opendata/", inLanguage: "ru-RU",
        }),
        ...(!filtered && items.length ? [ld({
          "@context": "https://schema.org", "@type": "ItemList", name: "Масштаб-500: топ-50",
          itemListElement: items.slice(0, 50).map((it) => ({ "@type": "ListItem", position: it.rank, item: { "@type": "Organization", name: it.name, taxID: it.inn } })),
        })] : []),
        breadcrumbLd([{ label: "Рейтинг «Масштаб-500»" }]),
      ],
    };
  },
  component: RatingPage,
});
