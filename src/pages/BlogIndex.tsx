import { Helmet } from "react-helmet-async";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import BlogCard from "@/components/BlogCard";
import { useBlogPosts } from "@/lib/blog";

const PAGE_URL = "https://mat-labs.ru/blog";
const TITLE = "Блог об автоматизации бизнеса и AI | МАТ-Лабс";
const DESCRIPTION =
  "Статьи и разборы от инженеров МАТ-Лабс: автоматизация бизнес-процессов, внедрение AI, гранты, цифровизация отраслей и опыт собственных продуктов.";

export default function BlogIndex() {
  const { posts, loading } = useBlogPosts();

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs items={[{ label: "Блог" }]} className="mb-8" />

          <header className="mb-12">
            <h1 className="font-oswald text-4xl md:text-5xl font-bold mb-5 leading-tight">
              Блог МАТ-Лабс
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl">
              Статьи, кейсы и технические разборы от наших инженеров: автоматизация,
              внедрение AI и опыт собственных продуктов.
            </p>
          </header>

          {loading ? (
            <div className="text-center py-10 text-white/30 text-sm">Загрузка статей...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">Статьи скоро появятся</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <BlogCard key={i} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
