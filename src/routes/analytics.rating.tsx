import { createFileRoute } from "@tanstack/react-router";
import RatingPage from "@/pages/analytics/RatingPage";

export const Route = createFileRoute("/analytics/rating")({ component: RatingPage });
