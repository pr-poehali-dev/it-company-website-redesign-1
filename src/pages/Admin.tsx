import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/6f798d48-8951-473b-bde6-f8121977ddf4";
const BLOG_URL = "https://functions.poehali.dev/f6938906-b3c4-4bf7-b1f9-96560e19ef1b";

const TAGS = ["AI/ML", "DevOps", "Frontend", "Backend", "Безопасность", "Аналитика"];
const TAG_COLORS: Record<string, string> = {
  "AI/ML": "from-violet-500 to-purple-600",
  "DevOps": "from-cyan-500 to-blue-600",
  "Frontend": "from-pink-500 to-rose-600",
  "Backend": "from-emerald-500 to-teal-600",
  "Безопасность": "from-orange-500 to-amber-600",
  "Аналитика": "from-indigo-500 to-blue-600",
};

interface Post {
  id: number;
  title: string;
  tag: string;
  read: string;
  color: string;
  content: string;
  published: boolean;
  date: string;
}

const emptyPost = (): Omit<Post, "id" | "date"> => ({
  title: "",
  tag: "AI/ML",
  read: "5 мин",
  color: TAG_COLORS["AI/ML"],
  content: "",
  published: true,
});

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "edit" | "new">("list");
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [form, setForm] = useState(emptyPost());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isAuth = Boolean(token);

  async function login() {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${AUTH_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Ошибка входа"); return; }
      sessionStorage.setItem("admin_token", data.token);
      setToken(data.token);
    } catch {
      setLoginError("Ошибка соединения");
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    sessionStorage.removeItem("admin_token");
    setToken("");
  }

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await fetch(`${BLOG_URL}/`, { headers: { "X-Session-Token": token } });
      const data = await res.json();
      setPosts(data.posts || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAuth) loadPosts(); }, [isAuth]);

  function startNew() {
    setForm(emptyPost());
    setEditPost(null);
    setView("new");
    setSaveSuccess(false);
  }

  function startEdit(post: Post) {
    setForm({ title: post.title, tag: post.tag, read: post.read, color: post.color, content: post.content, published: post.published });
    setEditPost(post);
    setView("edit");
    setSaveSuccess(false);
  }

  function handleTagChange(tag: string) {
    setForm(f => ({ ...f, tag, color: TAG_COLORS[tag] || f.color }));
  }

  async function savePost() {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const body = { ...form, read_time: form.read };
      if (view === "edit" && editPost) {
        await fetch(`${BLOG_URL}/${editPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Session-Token": token },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`${BLOG_URL}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Token": token },
          body: JSON.stringify(body),
        });
      }
      setSaveSuccess(true);
      await loadPosts();
      setTimeout(() => { setView("list"); setSaveSuccess(false); }, 800);
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(id: number) {
    await fetch(`${BLOG_URL}/${id}`, { method: "DELETE", headers: { "X-Session-Token": token } });
    setDeleteId(null);
    await loadPosts();
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-[#080812] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-4">
              <span className="font-oswald font-bold text-xl text-white">МЛ</span>
            </div>
            <h1 className="font-oswald text-2xl font-bold gradient-text">Панель администратора</h1>
            <p className="text-white/40 text-sm mt-1">ООО МАТ-Лабс</p>
          </div>

          <div className="glass neon-border rounded-3xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Логин</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && login()}
                placeholder="admin"
                className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Пароль</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && login()}
                placeholder="••••••••"
                className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
              />
            </div>
            {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
            <button
              onClick={login}
              disabled={loginLoading}
              className="btn-gradient w-full py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50"
            >
              {loginLoading ? "Входим..." : "Войти"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {/* Header */}
      <div className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
            <span className="font-oswald font-bold text-xs text-white">МЛ</span>
          </div>
          <span className="font-oswald font-bold text-lg gradient-text">Админ-панель</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-white/40 hover:text-white text-sm transition-colors flex items-center gap-1">
            <Icon name="ExternalLink" size={14} />
            Сайт
          </a>
          <button onClick={logout} className="glass border border-white/10 px-3 py-1.5 rounded-xl text-white/60 hover:text-white text-sm transition-all flex items-center gap-1">
            <Icon name="LogOut" size={14} />
            Выйти
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* LIST VIEW */}
        {view === "list" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-oswald text-2xl font-bold text-white">Статьи блога</h2>
              <button onClick={startNew} className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
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
                <button onClick={startNew} className="mt-4 btn-gradient px-6 py-2.5 rounded-xl text-sm font-semibold text-white">
                  Создать первую
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => (
                  <div key={post.id} className="glass neon-border rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-1 h-12 rounded-full bg-gradient-to-b ${post.color} flex-shrink-0`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                          <span className="text-white/30 text-xs">{post.read} чтения</span>
                          {!post.published && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">Скрыта</span>}
                        </div>
                        <p className="text-white font-medium text-sm truncate">{post.title}</p>
                        <p className="text-white/30 text-xs mt-0.5">{post.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(post)} className="w-9 h-9 glass border border-white/10 rounded-xl flex items-center justify-center hover:border-violet-500/40 hover:bg-violet-500/10 transition-all">
                        <Icon name="Pencil" size={14} className="text-white/60" />
                      </button>
                      <button onClick={() => setDeleteId(post.id)} className="w-9 h-9 glass border border-white/10 rounded-xl flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 transition-all">
                        <Icon name="Trash2" size={14} className="text-white/60" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* EDIT / NEW VIEW */}
        {(view === "edit" || view === "new") && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView("list")} className="w-9 h-9 glass border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all">
                <Icon name="ArrowLeft" size={16} className="text-white/60" />
              </button>
              <h2 className="font-oswald text-2xl font-bold text-white">
                {view === "new" ? "Новая статья" : "Редактировать статью"}
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="glass neon-border rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Заголовок *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Введите заголовок статьи"
                      className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-2">Текст статьи</label>
                    <p className="text-white/30 text-xs mb-2">Поддерживается Markdown: ## Заголовок, **жирный**, * пункт списка</p>
                    <textarea
                      rows={18}
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      placeholder="Напишите текст статьи..."
                      className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm resize-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass neon-border rounded-2xl p-5 space-y-4">
                  <h3 className="font-semibold text-sm text-white/80">Настройки</h3>

                  <div>
                    <label className="block text-xs text-white/50 mb-2">Категория</label>
                    <div className="flex flex-wrap gap-2">
                      {TAGS.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagChange(tag)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-all ${form.tag === tag ? `bg-gradient-to-r ${TAG_COLORS[tag]} text-white` : "glass border border-white/10 text-white/50 hover:text-white"}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2">Время чтения</label>
                    <input
                      type="text"
                      value={form.read}
                      onChange={e => setForm(f => ({ ...f, read: e.target.value }))}
                      placeholder="5 мин"
                      className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Опубликована</span>
                    <button
                      onClick={() => setForm(f => ({ ...f, published: !f.published }))}
                      className={`w-11 h-6 rounded-full transition-all relative ${form.published ? "bg-violet-600" : "bg-white/10"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.published ? "left-5.5 translate-x-0.5" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={savePost}
                  disabled={saving || !form.title.trim()}
                  className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${saveSuccess ? "bg-emerald-600 text-white" : "btn-gradient text-white"} disabled:opacity-50`}
                >
                  {saving ? (
                    <><Icon name="Loader2" size={16} className="animate-spin" /> Сохранение...</>
                  ) : saveSuccess ? (
                    <><Icon name="Check" size={16} /> Сохранено!</>
                  ) : (
                    <><Icon name="Save" size={16} /> Сохранить</>
                  )}
                </button>

                <button onClick={() => setView("list")} className="w-full py-3 rounded-2xl text-sm text-white/50 hover:text-white glass border border-white/10 transition-all">
                  Отмена
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative glass neon-border rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-oswald text-lg font-bold text-white mb-2">Удалить статью?</h3>
            <p className="text-white/50 text-sm mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => deletePost(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
                Удалить
              </button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-white/60 hover:text-white text-sm transition-all">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
