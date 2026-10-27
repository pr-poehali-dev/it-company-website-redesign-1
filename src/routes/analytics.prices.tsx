import { createFileRoute } from "@tanstack/react-router";
import PricesPage from "@/pages/analytics/PricesPage";

export const Route = createFileRoute("/analytics/prices")({ component: PricesPage });
