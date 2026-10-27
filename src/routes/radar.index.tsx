import { createFileRoute } from "@tanstack/react-router";
import Radar from "@/pages/Radar";

export const Route = createFileRoute("/radar/")({ component: Radar });
