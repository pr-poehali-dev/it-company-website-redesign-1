import { createFileRoute } from "@tanstack/react-router";
import MarketIndex from "@/pages/analytics/MarketIndex";

export const Route = createFileRoute("/analytics/market/")({ component: MarketIndex });
