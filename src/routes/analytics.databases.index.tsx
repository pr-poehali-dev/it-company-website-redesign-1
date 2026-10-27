import { createFileRoute } from "@tanstack/react-router";
import DatabasesPage from "@/pages/analytics/DatabasesPage";

export const Route = createFileRoute("/analytics/databases/")({ component: DatabasesPage });
