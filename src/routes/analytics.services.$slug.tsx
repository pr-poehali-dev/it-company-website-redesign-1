import { createFileRoute } from "@tanstack/react-router";
import ServiceDetail from "@/pages/analytics/ServiceDetail";

export const Route = createFileRoute("/analytics/services/$slug")({ component: ServiceDetail });
