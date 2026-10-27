import { createFileRoute, notFound } from "@tanstack/react-router";
import ServiceDetail from "@/pages/analytics/ServiceDetail";
import { findService } from "@/components/biz/servicesData";

export const Route = createFileRoute("/analytics/services/$slug")({
  loader: ({ params }) => {
    if (!findService(params.slug)) throw notFound();
  },
  component: ServiceDetail,
});