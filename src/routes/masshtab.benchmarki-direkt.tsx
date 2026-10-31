import { createFileRoute } from "@tanstack/react-router";
import BenchmarkPage from "@/components/masshtab/BenchmarkPage";
import { breadcrumbLd, pageMeta, serviceLd } from "@/components/masshtab/seo";

const DESC = "Цена клика, конверсия, стоимость клиента и LTV по нишам. Предзаказ отраслевого отчёта или бесплатный доступ в обмен на обезличенные данные.";

export const Route = createFileRoute("/masshtab/benchmarki-direkt")({
  head: () => ({
    ...pageMeta({ title: "Бенчмарки Яндекс Директа и e-commerce: цена клика, CAC, LTV — журнал «Масштаб»", description: DESC, path: "/masshtab/benchmarki-direkt" }),
    scripts: [serviceLd({ name: "Бенчмарки Яндекс Директа и e-commerce", serviceType: "Отраслевой отчёт по рекламе", description: DESC, path: "/masshtab/benchmarki-direkt", offers: [{ name: "Отчёт по всем нишам", price: 15000 }, { name: "Отчёт по вашей нише", price: 25000 }] }), breadcrumbLd([{ label: "Аналитические отчёты", to: "/masshtab/otchety" }, { label: "Бенчмарки Директа и e-commerce" }])],
  }),
  component: BenchmarkPage,
});
