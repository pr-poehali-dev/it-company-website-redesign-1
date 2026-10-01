import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/shared";
import BlogCard from "@/components/BlogCard";
import { useBlogPosts } from "@/lib/blog";

export default function BlogSection() {
  const { posts, loading: postsLoading } = useBlogPosts();

  return (
    <section id="blog" className="py-24 relative">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-amber-300 border border-amber-500/30 mb-6">
            Блог
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Делимся{" "}
            <span className="gradient-text">экспертизой</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">Статьи, кейсы и технические разборы от наших инженеров</p>
        </AnimatedSection>

        {postsLoading ? (
          <div className="text-center py-10 text-white/30 text-sm">Загрузка статей...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-sm">Статьи скоро появятся</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <AnimatedSection key={i}>
                <BlogCard post={post} />
              </AnimatedSection>
            ))}
          </div>
        )}

        <AnimatedSection className="text-center mt-10">
          <Link
            to="/blog"
            className="inline-block glass border border-white/20 px-8 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 text-sm font-semibold"
          >
            Все статьи
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
