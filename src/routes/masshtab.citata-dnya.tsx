import { createFileRoute } from "@tanstack/react-router";
import QuotePage from "@/components/masshtab/QuotePage";
import { mGet, type QuoteResp } from "@/components/masshtab/api";
import { SITE, breadcrumbLd, ld, pageMeta } from "@/components/masshtab/seo";

export const Route = createFileRoute("/masshtab/citata-dnya")({
  loader: async () => {
    const { data } = await mGet<QuoteResp>({ action: "quote", archive: 1 });
    return { quote: data?.quote ?? null, archive: data?.archive ?? [] };
  },
  head: ({ loaderData }) => {
    const q = loaderData?.quote;
    const desc = q ? `«${q.text}» — ${q.author}. Цитата дня делового журнала «Масштаб» с комментарием редакции.` : "Цитата дня делового журнала «Масштаб»: мысли предпринимателей и инвесторов с комментарием редакции.";
    return {
      ...pageMeta({ title: "Цитата дня — деловой журнал «Масштаб»", description: desc.slice(0, 300), path: "/masshtab/citata-dnya" }),
      scripts: [
        ...(q ? [ld({ "@context": "https://schema.org", "@type": "Quotation", text: q.text, creator: { "@type": "Person", name: q.author }, url: `${SITE}/masshtab/citata-dnya` })] : []),
        breadcrumbLd([{ label: "Цитата дня" }]),
      ],
    };
  },
  component: QuotePage,
});
