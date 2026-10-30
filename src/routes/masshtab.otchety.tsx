import { createFileRoute } from "@tanstack/react-router";
import ReportsPage from "@/components/masshtab/ReportsPage";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/otchety")({
  head: () => ({
    ...pageMeta({ title: "Аналитические отчёты на заказ — журнал «Масштаб»", description: "Расчёт рынка для заявки в ФСИ и Сколково, отраслевые бенчмарки, юнит-экономика, анализ рынка и окупаемость автоматизации на данных ФНС, Росстата и ЕИС.", path: "/masshtab/otchety" }),
    scripts: [breadcrumbLd([{ label: "Аналитические отчёты" }])],
  }),
  component: ReportsPage,
});
