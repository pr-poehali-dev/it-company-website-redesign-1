import { createFileRoute } from "@tanstack/react-router";
import BiSharedPage from "@/pages/analytics/BiSharedPage";

export const Route = createFileRoute("/analytics/bi/s/$id")({ component: BiSharedPage });
