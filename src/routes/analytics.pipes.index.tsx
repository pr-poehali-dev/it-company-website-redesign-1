import { createFileRoute } from "@tanstack/react-router";
import PipesLanding from "@/pages/analytics/PipesLanding";

export const Route = createFileRoute("/analytics/pipes/")({ component: PipesLanding });
