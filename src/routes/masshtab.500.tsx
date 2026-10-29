import { createFileRoute } from "@tanstack/react-router";
import RatingPage from "@/components/masshtab/RatingPage";
import { mGet, type Filters, type RatingResp } from "@/components/masshtab/api";

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
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: "Масштаб-500 — самые быстрорастущие компании России" }, { property: "og:description", content: DESC },
      { property: "og:image", content: "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/1292b992-95e1-4928-b8a9-a0860381b3ea.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://mat-labs.ru/masshtab/500" }],
  }),
  component: RatingPage,
});
