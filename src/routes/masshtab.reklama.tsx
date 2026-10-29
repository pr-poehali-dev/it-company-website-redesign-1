import { createFileRoute } from "@tanstack/react-router";
import AdsPage from "@/components/masshtab/AdsPage";
import { mGet, type RatingResp } from "@/components/masshtab/api";

const DESC = "Реклама в деловом листке «Масштаб»: баннеры, партнёрские материалы, спонсорство рейтинга «Масштаб-500». Заявка на интервью для предпринимателей.";

export const Route = createFileRoute("/masshtab/reklama")({
  validateSearch: (s: Record<string, unknown>): { company?: string } => ({ company: typeof s.company === "string" ? s.company.slice(0, 120) : undefined }),
  loader: async () => ({ rating: (await mGet<RatingResp>({ action: "rating" })).data }),
  head: () => ({
    meta: [{ title: "Реклама и интервью в листке «Масштаб»" }, { name: "description", content: DESC },
      { property: "og:title", content: "Реклама и интервью в листке «Масштаб»" }, { property: "og:description", content: DESC }],
    links: [{ rel: "canonical", href: "https://mat-labs.ru/masshtab/reklama" }],
  }),
  component: AdsPage,
});
