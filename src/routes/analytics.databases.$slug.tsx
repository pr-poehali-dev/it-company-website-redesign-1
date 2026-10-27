import { createFileRoute } from "@tanstack/react-router";
import DatabaseView from "@/pages/analytics/DatabaseView";

export const Route = createFileRoute("/analytics/databases/$slug")({ component: DatabaseView });
