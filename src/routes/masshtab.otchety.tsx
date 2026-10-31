import { createFileRoute } from "@tanstack/react-router";
import ReportsPage from "@/components/masshtab/ReportsPage";
import { REPORTS } from "@/components/masshtab/products";
import { breadcrumbLd, pageMeta, serviceLd } from "@/components/masshtab/seo";

const DESC = "Расчёт рынка для заявки в ФСИ и Сколково, отраслевые бенчмарки, юнит-экономика, анализ рынка и окупаемость автоматизации на данных ФНС, Росстата и ЕИС.";

export const Route = createFileRoute("/masshtab/otchety")({
  head: () => ({
    ...pageMeta({ title: "Аналитические отчёты на заказ — журнал «Масштаб»", description: DESC, path: "/masshtab/otchety" }),
    scripts: [serviceLd({ name: "Аналитические отчёты на заказ", serviceType: "Бизнес-аналитика и исследования рынка", description: DESC, path: "/masshtab/otchety", offers: REPORTS.map((r) => ({ name: r.t, description: r.d, price: Number(r.price.replace(/\D/g, "")) })) }), breadcrumbLd([{ label: "Аналитические отчёты" }])],
  }),
  component: ReportsPage,
});
