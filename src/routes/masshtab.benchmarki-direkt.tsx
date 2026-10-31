import { createFileRoute } from "@tanstack/react-router";
import BenchmarkPage from "@/components/masshtab/BenchmarkPage";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/benchmarki-direkt")({
  head: () => ({
    ...pageMeta({ title: "Бенчмарки Яндекс Директа и e-commerce: цена клика, CAC, LTV — журнал «Масштаб»", description: "Цена клика, конверсия, стоимость клиента и LTV по нишам. Предзаказ отраслевого отчёта или бесплатный доступ в обмен на обезличенные данные.", path: "/masshtab/benchmarki-direkt" }),
    scripts: [breadcrumbLd([{ label: "Аналитические отчёты", to: "/masshtab/otchety" }, { label: "Бенчмарки Директа и e-commerce" }])],
  }),
  component: BenchmarkPage,
});
