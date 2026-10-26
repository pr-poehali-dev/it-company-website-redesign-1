import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import PageBreadcrumbs, { Crumb } from "@/components/PageBreadcrumbs";
import BizNav from "./BizNav";

interface Props {
  title: string;
  description: string;
  path: string;
  crumbs: Crumb[];
  children: ReactNode;
  noindex?: boolean;
  image?: string;
}

export const OG_IMAGE = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/bucket/445e832b-e1ed-413e-a842-7a510d6d41f1.jpg";

export default function BizShell({ title, description, path, crumbs, children, noindex, image = OG_IMAGE }: Props) {
  const url = `https://mat-labs.ru${path}`;
  const desc = description.length > 200 ? description.slice(0, 197).replace(/\s+\S*$/, "") + "…" : description;
  return (
    <>
      <Helmet>
        <html lang="ru" />
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta name="robots" content={noindex ? "noindex, follow" : "index, follow, max-image-preview:large"} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="МАТ-Лабс" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={image} />
      </Helmet>
      <div className="min-h-screen bg-[#080812] text-white font-['Golos_Text',sans-serif] overflow-x-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 relative">
          <PageBreadcrumbs items={crumbs} className="mb-5" />
          <BizNav />
          {children}
        </div>
      </div>
    </>
  );
}
