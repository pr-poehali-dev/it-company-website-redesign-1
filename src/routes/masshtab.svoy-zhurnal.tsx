import { createFileRoute } from "@tanstack/react-router";
import CustomPromo from "@/components/masshtab/custom/CustomPromo";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/svoy-zhurnal")({
  head: () => ({
    ...pageMeta({
      title: "Свой «Масштаб» — персональный выпуск журнала в PDF за 990 ₽",
      description: "Соберите деловой журнал под себя: статьи, полосы вышедших номеров, рейтинг «Масштаб-500» по вашему региону и отрасли, индикаторы рынка и обложка с вашим именем. PDF сразу после оплаты.",
      path: "/masshtab/svoy-zhurnal",
    }),
    scripts: [breadcrumbLd([{ label: "Свой журнал" }])],
  }),
  component: CustomPromo,
});
