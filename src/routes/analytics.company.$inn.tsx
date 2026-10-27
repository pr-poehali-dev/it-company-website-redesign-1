import { createFileRoute } from "@tanstack/react-router";
import CompanyReport from "@/pages/analytics/CompanyReport";
import { loadCompany } from "@/components/biz/bizLoaders";

export const Route = createFileRoute("/analytics/company/$inn")({
  loader: ({ params }) => loadCompany(params.inn),
  component: CompanyReport,
});
