import { createFileRoute, notFound } from "@tanstack/react-router";
import RadarCompany from "@/pages/RadarCompany";
import { RADAR_URL } from "@/components/radar/radarApi";

export const Route = createFileRoute("/radar/$inn")({
  loader: async ({ params }) => {
    if (!/^\d{10}(\d{2})?$/.test(params.inn)) throw notFound();
    try {
      const res = await fetch(`${RADAR_URL}/?action=company&inn=${params.inn}`);
      if (res.status === 404) throw notFound();
      const json = await res.json();
      return { data: res.ok && !json?.error ? json : null };
    } catch (e) {
      if (e && typeof e === "object" && "isNotFound" in e) throw e;
      return { data: null };
    }
  },
  component: RadarCompany,
});
