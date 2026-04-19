import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import AdminLogin from "./admin/AdminLogin";
import AdminPostList from "./admin/AdminPostList";
import AdminPostEditor from "./admin/AdminPostEditor";
import TenderSearch from "./admin/TenderSearch";
import { AUTH_URL, BLOG_URL, Post, PostForm, emptyPost } from "./admin/types";

type Section = "blog" | "tenders";

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [section, setSection] = useState<Section>("blog");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "edit" | "new">("list");
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [form, setForm] = useState<PostForm>(emptyPost());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isAuth = Boolean(token);

  async function login() {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${AUTH_URL}/`, {
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
    setForm({ title: post.title, tag: post.tag, read: post.read, color: post.color, content: post.content, published: post.published, cover_url: post.cover_url ?? null });
    setEditPost(post);
    setView("edit");
    setSaveSuccess(false);
  }

  async function savePost(publish: boolean) {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const body = { ...form, published: publish, read_time: form.read };
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
      setForm(f => ({ ...f, published: publish }));
      await loadPosts();
      setTimeout(() => { setView("list"); setSaveSuccess(false); }, 900);
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
      <AdminLogin
        loginForm={loginForm}
        loginError={loginError}
        loginLoading={loginLoading}
        onChangeForm={(field, value) => setLoginForm(f => ({ ...f, [field]: value }))}
        onLogin={login}
      />
    );
  }

  const NAV: { id: Section; label: string; icon: string; badge?: number }[] = [
    { id: "blog", label: "Статьи блога", icon: "FileText", badge: posts.length || undefined },
    { id: "tenders", label: "Тендеры", icon: "Search" },
  ];

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {/* Header */}
      <div className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center flex-shrink-0">
              <span className="font-oswald font-bold text-xs text-white">МЛ</span>
            </div>
            <span className="font-oswald font-bold text-lg gradient-text hidden sm:block">Админ-панель</span>
          </div>

          {/* Section nav */}
          <div className="flex items-center gap-1 glass border border-white/10 rounded-xl p-1">
            {NAV.map(n => (
              <button
                key={n.id}
                onClick={() => { setSection(n.id); setView("list"); }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  section === n.id
                    ? "bg-violet-600 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon name={n.icon as "Search"} size={14} />
                <span className="hidden sm:block">{n.label}</span>
                {n.badge !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${section === n.id ? "bg-white/20" : "bg-white/10"}`}>
                    {n.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noreferrer" className="text-white/40 hover:text-white text-sm transition-colors flex items-center gap-1">
            <Icon name="ExternalLink" size={14} />
            <span className="hidden sm:block">Сайт</span>
          </a>
          <button onClick={logout} className="glass border border-white/10 px-3 py-1.5 rounded-xl text-white/60 hover:text-white text-sm transition-all flex items-center gap-1">
            <Icon name="LogOut" size={14} />
            <span className="hidden sm:block">Выйти</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* BLOG SECTION */}
        {section === "blog" && (
          <>
            {view === "list" && (
              <AdminPostList
                posts={posts}
                loading={loading}
                onNew={startNew}
                onEdit={startEdit}
                onDeleteRequest={setDeleteId}
              />
            )}
            {(view === "edit" || view === "new") && (
              <AdminPostEditor
                view={view}
                form={form}
                saving={saving}
                saveSuccess={saveSuccess}
                onChangeForm={updates => setForm(f => ({ ...f, ...updates }))}
                onSave={savePost}
                onCancel={() => setView("list")}
              />
            )}
          </>
        )}

        {/* TENDERS SECTION */}
        {section === "tenders" && (
          <TenderSearch token={token} />
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
