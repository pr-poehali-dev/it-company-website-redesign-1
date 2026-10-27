import { createFileRoute } from "@tanstack/react-router";
import DatabasesPage from "@/pages/analytics/DatabasesPage";
import { loadDatabases } from "@/components/biz/bizLoaders";

export const Route = createFileRoute("/analytics/databases/")({ loader: loadDatabases, component: DatabasesPage });