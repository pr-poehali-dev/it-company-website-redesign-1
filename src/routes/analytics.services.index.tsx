import { createFileRoute } from "@tanstack/react-router";
import ServicesPage from "@/pages/analytics/ServicesPage";

export const Route = createFileRoute("/analytics/services/")({ component: ServicesPage });
