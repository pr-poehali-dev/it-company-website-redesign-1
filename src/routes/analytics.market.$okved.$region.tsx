import { createFileRoute } from "@tanstack/react-router";
import MarketReport from "@/pages/analytics/MarketReport";

export const Route = createFileRoute("/analytics/market/$okved/$region")({ component: MarketReport });
