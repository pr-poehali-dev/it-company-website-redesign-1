import { createFileRoute } from "@tanstack/react-router";
import RadarCompany from "@/pages/RadarCompany";

export const Route = createFileRoute("/radar/$inn")({ component: RadarCompany });
