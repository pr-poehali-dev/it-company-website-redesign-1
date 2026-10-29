import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/components/masshtab/AboutPage";

const DESC = "Рубрики, редакционные принципы и источники данных делового листка «Масштаб».";

export const Route = createFileRoute("/masshtab/o-zhurnale")({
  head: () => ({
    meta: [{ title: "О журнале «Масштаб»: рубрики, принципы, источники" }, { name: "description", content: DESC },
      { property: "og:title", content: "О журнале «Масштаб»" }, { property: "og:description", content: DESC }],
    links: [{ rel: "canonical", href: "https://mat-labs.ru/masshtab/o-zhurnale" }],
  }),
  component: AboutPage,
});
