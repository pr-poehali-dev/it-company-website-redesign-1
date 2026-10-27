import { createFileRoute, notFound } from "@tanstack/react-router";
import ServiceCityPage from "@/pages/ServiceCityPage";
import { findCity } from "@/lib/cities";
import { findGeoService } from "@/lib/serviceGeo";

export const Route = createFileRoute("/uslugi/$serviceSlug/$citySlug")({
  loader: ({ params }) => {
    if (!findGeoService(params.serviceSlug) || !findCity(params.citySlug)) throw notFound();
  },
  component: ServiceCityPage,
});
