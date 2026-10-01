import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { type BlogPost } from "@/components/BlogModal";
import { blogPath } from "@/lib/blog";

export default function BlogCard({ post }: { post: BlogPost }) {
  const inner = (
    <>
      {post.cover_url ? (
        <div className="relative h-40 overflow-hidden flex-shrink-0">
          <img src={post.cover_url} alt={post.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
    </>
  );

  const cls = "glass neon-border rounded-2xl overflow-hidden card-hover group h-full flex flex-col";

  return post.content ? (
    <Link to={blogPath(post.title)} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={`${cls} opacity-60`}>{inner}</div>
  );
}
