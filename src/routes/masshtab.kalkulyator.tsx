import { createFileRoute } from "@tanstack/react-router";
import CalcPage from "@/components/masshtab/CalcPage";
import { breadcrumbLd, calcLd, pageMeta } from "@/components/masshtab/seo";

const DESC = "Бесплатный калькулятор стоимости привлечения клиента, LTV, ROI и точки окупаемости. Пять цифр — и видно, зарабатываете вы на клиенте или теряете.";

export const Route = createFileRoute("/masshtab/kalkulyator")({
  head: () => ({
    ...pageMeta({ title: "Калькулятор CAC и LTV: окупается ли реклама — журнал «Масштаб»", description: DESC, path: "/masshtab/kalkulyator" }),
    scripts: [calcLd({ name: "Калькулятор CAC и LTV", description: DESC, path: "/masshtab/kalkulyator" }), breadcrumbLd([{ label: "Калькулятор окупаемости клиента" }])],
  }),
  component: CalcPage,
});
