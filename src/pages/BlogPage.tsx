import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import { type BlogPost } from "@/components/BlogModal";
import { generateSlug } from "@/lib/slug";

const BLOG_URL = "https://functions.poehali.dev/f6938906-b3c4-4bf7-b1f9-96560e19ef1b";
const SITE_URL = "https://mat-labs.ru";

function renderLine(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={j} className="text-white/80 italic">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={j} className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### "))
      return <h3 key={i} className="font-oswald text-xl font-bold text-white mt-6 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("## "))
      return <h2 key={i} className="font-oswald text-2xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith("# "))
      return <h1 key={i} className="font-oswald text-3xl font-bold text-white mt-8 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith("- ") || line.startsWith("* "))
      return <li key={i} className="text-white/70 text-base leading-relaxed ml-4 list-disc">{renderLine(line.slice(2))}</li>;
    if (/^\d+\./.test(line))
      return <li key={i} className="text-white/70 text-base leading-relaxed ml-4 list-decimal">{renderLine(line.replace(/^\d+\.\s/, ""))}</li>;
    if (line.trim() === "")
      return <div key={i} className="h-3" />;
    return <p key={i} className="text-white/70 text-base leading-relaxed">{renderLine(line)}</p>;
  });
}

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-64 bg-white/5 rounded-2xl" />
      <div className="h-8 bg-white/5 rounded-xl w-3/4" />
      <div className="h-4 bg-white/5 rounded-lg w-1/3" />
      <div className="space-y-3 mt-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-white/5 rounded-lg" style={{ width: `${80 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function BlogPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`${BLOG_URL}/`)
      .then((r) => r.json())
      .then((data) => {
        const posts: BlogPost[] = data.posts || [];
        const found = posts.find((p) => generateSlug(p.title) === slug);
        if (!found) {
          setNotFound(true);
        } else {
          setPost(found);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (notFound) {
      navigate("/", { replace: true });
    }
  }, [notFound, navigate]);

  const canonicalUrl = `${SITE_URL}/blog/${slug}`;
  const plainContent = post?.content?.replace(/[#*`_~]/g, "").replace(/\n+/g, " ").trim() ?? "";
  const description = plainContent.slice(0, 160);

  const jsonLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        datePublished: post.date,
        author: {
          "@type": "Organization",
          name: "ООО МАТ-Лабс",
        },
        publisher: {
          "@type": "Organization",
          name: "ООО МАТ-Лабс",
          url: SITE_URL,
        },
        ...(post.cover_url ? { image: post.cover_url } : {}),
        description,
        url: canonicalUrl,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {post && (
        <Helmet>
          <title>{post.title} | Блог MAT Labs</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:title" content={`${post.title} | Блог MAT Labs`} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:type" content="article" />
          {post.cover_url && <meta property="og:image" content={post.cover_url} />}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${post.title} | Блог MAT Labs`} />
          <meta name="twitter:description" content={description} />
          {post.cover_url && <meta name="twitter:image" content={post.cover_url} />}
          {jsonLd && (
            <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
          )}
        </Helmet>
      )}

      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-72 h-72 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-6 py-12 relative">
        <Link
          to="/#blog"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm mb-10 group"
        >
          <Icon name="ArrowLeft" size={16} className="group-hover:-translate-x-1 transition-transform" />
          Назад к блогу
        </Link>

        {loading ? (
          <SkeletonCard />
        ) : post ? (
          <article>
            {post.cover_url ? (
              <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
                <img
                  src={post.cover_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${post.color} text-white`}>
                    {post.tag}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`h-1.5 w-full bg-gradient-to-r ${post.color} rounded-full mb-8`} />
            )}

            <div className="glass neon-border rounded-3xl p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {!post.cover_url && (
                  <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${post.color} text-white`}>
                    {post.tag}
                  </span>
                )}
                <span className="text-white/40 text-xs flex items-center gap-1.5">
                  <Icon name="Calendar" size={12} />
                  {post.date}
                </span>
                <span className="text-white/40 text-xs flex items-center gap-1.5">
                  <Icon name="Clock" size={12} />
                  {post.read} чтения
                </span>
              </div>

              <h1 className="font-oswald text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
                {post.title}
              </h1>

              {post.content ? (
                <div className="space-y-1">{renderContent(post.content)}</div>
              ) : (
                <p className="text-white/40 text-sm">Содержимое статьи скоро появится.</p>
              )}
            </div>

            <div className="mt-8 glass neon-border rounded-2xl p-6">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Поделиться статьёй</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://vk.com/share.php?url=${encodeURIComponent(canonicalUrl)}&title=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 glass border border-white/10 hover:border-[#0077ff]/50 hover:bg-[#0077ff]/10 px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#0077ff]">
                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.71-1.033-1.01-1.49-1.143-1.744-1.143-.356 0-.458.102-.458.597v1.558c0 .427-.135.682-1.252.682-1.846 0-3.896-1.118-5.339-3.202C4.765 11.558 4.104 9.08 4.104 8.57c0-.254.102-.491.597-.491h1.744c.444 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .643.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
                  </svg>
                  ВКонтакте
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 glass border border-white/10 hover:border-[#29b6f6]/50 hover:bg-[#29b6f6]/10 px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#29b6f6]">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Telegram
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(canonicalUrl);
                  }}
                  className="flex items-center gap-2 glass border border-white/10 hover:border-white/30 hover:bg-white/5 px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white transition-all"
                >
                  <Icon name="Link" size={16} />
                  Скопировать ссылку
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-start">
              <Link
                to="/#blog"
                className="inline-flex items-center gap-2 glass border border-white/20 px-6 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold group"
              >
                <Icon name="ArrowLeft" size={16} className="group-hover:-translate-x-1 transition-transform" />
                Назад к блогу
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}