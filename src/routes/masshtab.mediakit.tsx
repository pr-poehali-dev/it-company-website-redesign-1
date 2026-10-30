import { createFileRoute } from "@tanstack/react-router";
import MediaKitPage from "@/components/masshtab/mediakit/MediaKitPage";
import { mGet, type RatingResp } from "@/components/masshtab/api";
import { pageMeta } from "@/components/masshtab/seo";

const DESC = "Медиакит делового журнала «Масштаб»: аудитория, форматы рекламы, цены, партнёрские материалы, спецпроекты и спонсорство рейтинга «Масштаб-500».";

export const Route = createFileRoute("/masshtab/mediakit")({
  loader: async () => ({ rating: (await mGet<RatingResp>({ action: "rating" })).data }),
  head: () => pageMeta({ title: "Медиакит журнала «Масштаб» — реклама для предпринимателей", description: DESC, path: "/masshtab/mediakit" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { rating } = Route.useLoaderData();
  return <MediaKitPage rating={rating} />;
}
