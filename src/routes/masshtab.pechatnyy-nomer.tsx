import { createFileRoute } from "@tanstack/react-router";
import IssueReader from "@/components/masshtab/IssueReader";
import { ISSUES, issueCover, issuePdf } from "@/components/masshtab/issues";
import { PUBLISHER, SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

const issue = ISSUES[0];
const DESC = `Печатная версия делового журнала «Масштаб»: ${issue.pages} полос, формат 210×280 мм. Листайте номер онлайн, скачайте PDF для чтения или для типографии.`;

export const Route = createFileRoute("/masshtab/pechatnyy-nomer")({
  head: () => ({
    ...pageMeta({ title: `${issue.title} — печатная версия | «Масштаб»`, description: DESC, path: "/masshtab/pechatnyy-nomer", image: issueCover(issue) }),
    scripts: [
      ld({
        "@context": "https://schema.org", "@type": "PublicationIssue", issueNumber: String(issue.number), name: issue.title,
        description: DESC, url: `${SITE}/masshtab/pechatnyy-nomer`, image: `${SITE}${issueCover(issue)}`, numberOfPages: issue.pages,
        isPartOf: { "@type": "Periodical", name: "Масштаб" }, publisher: PUBLISHER,
        copyrightHolder: { "@type": "Organization", name: "ООО «МАТ-Лабс»" }, copyrightYear: 2026,
        encoding: { "@type": "MediaObject", encodingFormat: "application/pdf", contentUrl: `${SITE}${issuePdf(issue)}` },
      }),
      breadcrumbLd([{ label: "Печатный номер" }]),
    ],
  }),
  component: () => <IssueReader issue={issue} />,
});
