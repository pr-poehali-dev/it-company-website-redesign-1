import { createFileRoute } from "@tanstack/react-router";
import CompanyReport from "@/pages/analytics/CompanyReport";

export const Route = createFileRoute("/analytics/company/")({ component: CompanyReport });
