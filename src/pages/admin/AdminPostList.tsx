import Icon from "@/components/ui/icon";
import { Post } from "./types";

interface AdminPostListProps {
  posts: Post[];
  loading: boolean;
  onNew: () => void;
  onEdit: (post: Post) => void;
  onDeleteRequest: (id: number) => void;
}

export default function AdminPostList({ posts, loading, onNew, onEdit, onDeleteRequest }: AdminPostListProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-oswald text-2xl font-bold text-white">Статьи блога</h2>
          <p className="text-white/40 text-sm mt-1">
            {posts.length} {posts.length === 1 ? "статья" : posts.length < 5 ? "статьи" : "статей"}
          </p>
        </div>
        <button onClick={onNew} className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
          <Icon name="Plus" size={16} />
          Новая статья
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/40">Загрузка...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="FileText" size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Статей пока нет</p>
          <button onClick={onNew} className="mt-4 btn-gradient px-6 py-2.5 rounded-xl text-sm font-semibold text-white">
            Создать первую
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="glass neon-border rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-violet-500/30 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-1 h-12 rounded-full bg-gradient-to-b ${post.color} flex-shrink-0`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                    <span className="text-white/30 text-xs">{post.read} чтения</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${post.published ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                      {post.published ? "Опубликована" : "Черновик"}
                    </span>
                  </div>
                  <p className="text-white font-medium text-sm truncate">{post.title}</p>
                  <p className="text-white/30 text-xs mt-0.5">{post.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(post)}
                  className="w-9 h-9 glass border border-white/10 rounded-xl flex items-center justify-center hover:border-violet-500/40 hover:bg-violet-500/10 transition-all"
                  title="Редактировать"
                >
                  <Icon name="Pencil" size={14} className="text-white/60" />
                </button>
                <button
                  onClick={() => onDeleteRequest(post.id)}
                  className="w-9 h-9 glass border border-white/10 rounded-xl flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 transition-all"
                  title="Удалить"
                >
                  <Icon name="Trash2" size={14} className="text-white/60" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
