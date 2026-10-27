import { createFileRoute } from "@tanstack/react-router";
import MarketReport from "@/pages/analytics/MarketReport";
import { loadMarket } from "@/components/biz/bizLoaders";

export const Route = createFileRoute("/analytics/market/$okved/$region")({
  loader: ({ params }) => loadMarket(params.okved, params.region),
  component: MarketReport,
});
