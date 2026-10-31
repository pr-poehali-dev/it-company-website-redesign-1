import { createFileRoute } from "@tanstack/react-router";
import CustomPromo from "@/components/masshtab/custom/CustomPromo";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/svoy-zhurnal")({
  head: () => ({
    ...pageMeta({
      title: "Свой «Масштаб» — персональный выпуск журнала в PDF за 990 ₽",
      description: "Соберите деловой журнал под себя: личный план роста на 5 лет, обучающие материалы учисьпро.рф, статьи и полосы вышедших номеров, рейтинг «Масштаб-500» и портрет рынка по вашему региону и отрасли, индикаторы и обложка с вашим именем. PDF сразу после оплаты.",
      path: "/masshtab/svoy-zhurnal",
    }),
    scripts: [breadcrumbLd([{ label: "Свой журнал" }])],
  }),
  component: CustomPromo,
});
