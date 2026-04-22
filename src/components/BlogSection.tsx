import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { type BlogPost } from "@/components/BlogModal";
import { generateSlug } from "@/lib/slug";

const BLOG_URL = "https://functions.poehali.dev/f6938906-b3c4-4bf7-b1f9-96560e19ef1b";

export default function BlogSection() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    fetch(`${BLOG_URL}/`)
      .then(r => r.json())
      .then(data => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
  }, []);

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
                <div
                  className={`glass neon-border rounded-2xl overflow-hidden card-hover group h-full flex flex-col ${post.content ? "cursor-pointer" : "opacity-60"}`}
                  onClick={() => post.content && navigate(`/blog/${generateSlug(post.title)}`)}
                >
                  {post.cover_url ? (
                    <div className="relative h-40 overflow-hidden flex-shrink-0">
                      <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className={`absolute bottom-3 left-3 text-xs px-2.5 py-1 rounded-full bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                    </div>
                  ) : (
                    <div className={`h-1.5 w-full bg-gradient-to-r ${post.color}`} />
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    {!post.cover_url && (
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                        <span className="text-white/30 text-xs">{post.read} чтения</span>
                      </div>
                    )}
                    {post.cover_url && (
                      <div className="flex justify-end mb-3">
                        <span className="text-white/30 text-xs">{post.read} чтения</span>
                      </div>
                    )}
                    <h3 className="font-oswald text-lg font-semibold mb-3 text-white leading-snug flex-1">{post.title}</h3>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-white/40 text-xs">{post.date}</span>
                      {post.content ? (
                        <div className="flex items-center gap-1 text-violet-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Читать</span>
                          <Icon name="ArrowRight" size={14} />
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs">Скоро</span>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        )}

        <AnimatedSection className="text-center mt-10">
          <button className="glass border border-white/20 px-8 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 text-sm font-semibold">
            Все статьи
          </button>
        </AnimatedSection>
      </div>
    </section>
  );
}
