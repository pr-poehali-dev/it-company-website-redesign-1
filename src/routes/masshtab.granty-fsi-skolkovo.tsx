import { createFileRoute } from "@tanstack/react-router";
import GrantPage from "@/components/masshtab/GrantPage";
import { breadcrumbLd, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/granty-fsi-skolkovo")({
  head: () => ({
    ...pageMeta({ title: "Расчёт рынка и экономики для заявки в ФСИ и Сколково — журнал «Масштаб»", description: "TAM/SAM/SOM, конкуренты, юнит-экономика и финансовая модель для заявки на грант ФСИ и Сколково на данных ФНС, Росстата и ЕИС. Пакеты от 35 000 ₽.", path: "/masshtab/granty-fsi-skolkovo" }),
    scripts: [breadcrumbLd([{ label: "Аналитические отчёты", to: "/masshtab/otchety" }, { label: "Расчёты для ФСИ и Сколково" }])],
  }),
  component: GrantPage,
});
