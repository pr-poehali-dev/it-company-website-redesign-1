import { createFileRoute } from "@tanstack/react-router";
import IssueArchive from "@/components/masshtab/IssueArchive";
import { ISSUES, issueCover } from "@/components/masshtab/issues";
import { PUBLISHER, SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

const DESC = "Архив печатных номеров делового журнала «Масштаб»: журнал выходит ежемесячно. Листайте любой номер онлайн или скачайте PDF.";

export const Route = createFileRoute("/masshtab/arhiv/")({
  head: () => ({
    ...pageMeta({ title: "Архив номеров журнала «Масштаб»", description: DESC, path: "/masshtab/arhiv", image: ISSUES[0] ? issueCover(ISSUES[0]) : undefined }),
    scripts: [
      ld({
        "@context": "https://schema.org", "@type": "Periodical", name: "Масштаб", description: DESC, url: `${SITE}/masshtab/arhiv`, publisher: PUBLISHER, inLanguage: "ru-RU",
        hasPart: ISSUES.map((i) => ({ "@type": "PublicationIssue", issueNumber: String(i.number), name: i.title, url: `${SITE}/masshtab/arhiv/${i.id}`, numberOfPages: i.pages })),
      }),
      breadcrumbLd([{ label: "Архив номеров" }]),
    ],
  }),
  component: IssueArchive,
});
