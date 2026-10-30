import { createFileRoute } from "@tanstack/react-router";
import CalcPage from "@/components/masshtab/CalcPage";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/kalkulyator")({
  head: () => ({
    ...pageMeta({ title: "Калькулятор CAC и LTV: окупается ли реклама — журнал «Масштаб»", description: "Бесплатный калькулятор стоимости привлечения клиента, LTV, ROI и точки окупаемости. Пять цифр — и видно, зарабатываете вы на клиенте или теряете.", path: "/masshtab/kalkulyator" }),
    scripts: [breadcrumbLd([{ label: "Калькулятор окупаемости клиента" }])],
  }),
  component: CalcPage,
});
