import { createFileRoute } from "@tanstack/react-router";
import GrantPage from "@/components/masshtab/GrantPage";
import { breadcrumbLd, pageMeta, serviceLd } from "@/components/masshtab/seo";

const DESC = "TAM/SAM/SOM, конкуренты, юнит-экономика и финансовая модель для заявки на грант ФСИ и Сколково на данных ФНС, Росстата и ЕИС. Пакеты от 35 000 ₽.";

export const Route = createFileRoute("/masshtab/granty-fsi-skolkovo")({
  head: () => ({
    ...pageMeta({ title: "Расчёт рынка и экономики для заявки в ФСИ и Сколково — журнал «Масштаб»", description: DESC, path: "/masshtab/granty-fsi-skolkovo" }),
    scripts: [serviceLd({ name: "Расчёт рынка и экономики для заявки в ФСИ и Сколково", serviceType: "Подготовка материалов для грантовой заявки", description: DESC, path: "/masshtab/granty-fsi-skolkovo", offers: [{ name: "Пакет «Рынок»", price: 35000 }, { name: "Пакет «Рынок и экономика»", price: 70000 }, { name: "Пакет «Под ключ»", price: 120000 }] }), breadcrumbLd([{ label: "Аналитические отчёты", to: "/masshtab/otchety" }, { label: "Расчёты для ФСИ и Сколково" }])],
  }),
  component: GrantPage,
});
