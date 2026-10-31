import { createFileRoute } from "@tanstack/react-router";
import RoiCalcPage from "@/components/masshtab/RoiCalcPage";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/kalkulyator-analitiki")({
  head: () => ({
    ...pageMeta({ title: "Калькулятор окупаемости аналитики: ROI пилота — журнал «Масштаб»", description: "Посчитайте ROI и срок окупаемости предиктивной аналитики и BI: запасы, упущенные продажи, списания, реклама и полная стоимость проекта за 3 года.", path: "/masshtab/kalkulyator-analitiki" }),
    scripts: [breadcrumbLd([{ label: "Калькулятор окупаемости аналитики" }])],
  }),
  component: RoiCalcPage,
});
