import { createFileRoute } from "@tanstack/react-router";
import SubscriptionPage from "@/components/masshtab/SubscriptionPage";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/podpiska")({
  head: () => ({
    ...pageMeta({ title: "Корпоративная подписка на аналитику — журнал «Масштаб»", description: "Закрытые отраслевые отчёты, бенчмарки и сценарии бюджета каждый месяц для финансовых директоров, стратегов и инвестиционных подразделений.", path: "/masshtab/podpiska" }),
    scripts: [breadcrumbLd([{ label: "Корпоративная подписка" }])],
  }),
  component: SubscriptionPage,
});
