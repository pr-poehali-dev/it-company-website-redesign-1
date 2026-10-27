import { createFileRoute } from "@tanstack/react-router";
import AnalyticsHome from "@/pages/analytics/AnalyticsHome";
import { loadOverview } from "@/components/biz/bizLoaders";

export const Route = createFileRoute("/analytics/")({ loader: loadOverview, component: AnalyticsHome });