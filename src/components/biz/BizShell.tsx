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
}

export default function BizShell({ title, description, path, crumbs, children }: Props) {
  const url = `https://mat-labs.ru${path}`;
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
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
