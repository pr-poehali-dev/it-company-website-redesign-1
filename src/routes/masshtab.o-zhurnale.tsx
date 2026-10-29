import { createFileRoute } from "@tanstack/react-router";
import AboutPage from "@/components/masshtab/AboutPage";
import { PUBLISHER, SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

const DESC = "Рубрики, редакционные принципы и источники данных делового журнала «Масштаб»: Банк России, Росстат, ФНС, ТАСС.";

export const Route = createFileRoute("/masshtab/o-zhurnale")({
  head: () => ({
    ...pageMeta({ title: "О журнале «Масштаб»: рубрики, принципы, источники", description: DESC, path: "/masshtab/o-zhurnale" }),
    scripts: [
      ld({ "@context": "https://schema.org", "@type": "AboutPage", name: "О журнале «Масштаб»", url: `${SITE}/masshtab/o-zhurnale`, description: DESC, publisher: PUBLISHER }),
      breadcrumbLd([{ label: "О журнале" }]),
    ],
  }),
  component: AboutPage,
});
