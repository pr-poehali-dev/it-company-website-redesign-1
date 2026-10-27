import { createFileRoute, notFound } from "@tanstack/react-router";
import CityPage from "@/pages/CityPage";
import { findCity } from "@/lib/cities";

export const Route = createFileRoute("/avtomatizaciya-biznesa/$citySlug")({
  loader: ({ params }) => {
    if (!findCity(params.citySlug)) throw notFound();
  },
  component: CityPage,
});
