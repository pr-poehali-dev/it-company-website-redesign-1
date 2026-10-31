import { createFileRoute } from "@tanstack/react-router";
import SubscriptionPage from "@/components/masshtab/SubscriptionPage";
import { PLANS } from "@/components/masshtab/products";
import { breadcrumbLd, pageMeta, serviceLd } from "@/components/masshtab/seo";

const DESC = "Закрытые отраслевые отчёты, бенчмарки и сценарии бюджета каждый месяц для финансовых директоров, стратегов и инвестиционных подразделений.";

export const Route = createFileRoute("/masshtab/podpiska")({
  head: () => ({
    ...pageMeta({ title: "Корпоративная подписка на аналитику — журнал «Масштаб»", description: DESC, path: "/masshtab/podpiska" }),
    scripts: [serviceLd({ name: "Корпоративная подписка на аналитику", serviceType: "Подписка на отраслевую аналитику", description: DESC, path: "/masshtab/podpiska", offers: PLANS.map((p) => ({ name: `Тариф «${p.t}»`, description: p.items.join("; "), price: Number(p.p.replace(/\D/g, "")), unit: "MON" })) }), breadcrumbLd([{ label: "Корпоративная подписка" }])],
  }),
  component: SubscriptionPage,
});
