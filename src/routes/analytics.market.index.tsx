import { createFileRoute } from "@tanstack/react-router";
import MarketIndex from "@/pages/analytics/MarketIndex";
import { loadOverview } from "@/components/biz/bizLoaders";

export const Route = createFileRoute("/analytics/market/")({ loader: loadOverview, component: MarketIndex });