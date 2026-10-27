import { createFileRoute } from "@tanstack/react-router";
import AnalyticsHome from "@/pages/analytics/AnalyticsHome";

export const Route = createFileRoute("/analytics/")({ component: AnalyticsHome });
