import { createFileRoute } from "@tanstack/react-router";
import DatabaseView from "@/pages/analytics/DatabaseView";
import { loadDatabase } from "@/components/biz/bizLoaders";

export const Route = createFileRoute("/analytics/databases/$slug")({
  loader: ({ params }) => loadDatabase(params.slug),
  component: DatabaseView,
});
