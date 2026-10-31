import { createFileRoute } from "@tanstack/react-router";
import RoiCalcPage from "@/components/masshtab/RoiCalcPage";
import { breadcrumbLd, calcLd, pageMeta } from "@/components/masshtab/seo";

const DESC = "Посчитайте ROI и срок окупаемости предиктивной аналитики и BI: запасы, упущенные продажи, списания, реклама и полная стоимость проекта за 3 года.";

export const Route = createFileRoute("/masshtab/kalkulyator-analitiki")({
  head: () => ({
    ...pageMeta({ title: "Калькулятор окупаемости аналитики: ROI пилота — журнал «Масштаб»", description: DESC, path: "/masshtab/kalkulyator-analitiki", image: "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/499d4709-38e6-4682-bd32-acdc66c67e58.jpg" }),
    scripts: [calcLd({ name: "Калькулятор окупаемости аналитики", description: DESC, path: "/masshtab/kalkulyator-analitiki" }), breadcrumbLd([{ label: "Калькулятор окупаемости аналитики" }])],
  }),
  component: RoiCalcPage,
});
