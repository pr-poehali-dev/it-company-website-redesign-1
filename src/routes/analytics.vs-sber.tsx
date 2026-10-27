import { createFileRoute } from "@tanstack/react-router";
import CompetitorsPage from "@/pages/analytics/CompetitorsPage";

export const Route = createFileRoute("/analytics/vs-sber")({ component: CompetitorsPage });
