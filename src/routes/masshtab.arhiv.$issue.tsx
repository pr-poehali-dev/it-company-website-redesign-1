import { createFileRoute, notFound } from "@tanstack/react-router";
import IssueReader from "@/components/masshtab/IssueReader";
import { ISSUES, issueCover, issuePdf } from "@/components/masshtab/issues";
import { PUBLISHER, SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/arhiv/$issue")({
  loader: ({ params }) => {
    if (!ISSUES.some((i) => i.id === params.issue)) throw notFound();
    return { id: params.issue };
  },
  head: ({ params }) => {
    const issue = ISSUES.find((i) => i.id === params.issue);
    if (!issue) return {};
    const desc = `${issue.title}: ${issue.pages} полос. Листайте номер делового журнала «Масштаб» онлайн или скачайте PDF.`;
    return {
      ...pageMeta({ title: `${issue.title} — архив | «Масштаб»`, description: desc, path: `/masshtab/arhiv/${issue.id}`, image: issueCover(issue) }),
      scripts: [
        ld({
          "@context": "https://schema.org", "@type": "PublicationIssue", issueNumber: String(issue.number), name: issue.title, description: desc,
          url: `${SITE}/masshtab/arhiv/${issue.id}`, image: `${SITE}${issueCover(issue)}`, numberOfPages: issue.pages,
          isPartOf: { "@type": "Periodical", name: "Масштаб" }, publisher: PUBLISHER,
          encoding: { "@type": "MediaObject", encodingFormat: "application/pdf", contentUrl: `${SITE}${issuePdf(issue)}` },
        }),
        breadcrumbLd([{ label: "Архив номеров", to: "/masshtab/arhiv" }, { label: issue.title }]),
      ],
    };
  },
  component: IssuePage,
});

function IssuePage() {
  const { id } = Route.useLoaderData();
  const issue = ISSUES.find((i) => i.id === id)!;
  return <IssueReader key={issue.id} issue={issue} archive />;
}
