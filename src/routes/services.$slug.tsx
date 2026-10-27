import { createFileRoute, notFound } from "@tanstack/react-router";
import ServicePage from "@/pages/ServicePage";
import { services } from "@/components/shared";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    if (!services.some((s) => s.slug === params.slug)) throw notFound();
  },
  component: ServicePage,
});
