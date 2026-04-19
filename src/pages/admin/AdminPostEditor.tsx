import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { PostForm, TAGS, TAG_COLORS, UPLOAD_URL, renderMarkdown } from "./types";

interface AdminPostEditorProps {
  view: "new" | "edit";
  form: PostForm;
  saving: boolean;
  saveSuccess: boolean;
  onChangeForm: (updates: Partial<PostForm>) => void;
  onSave: (publish: boolean) => void;
  onCancel: () => void;
}

export default function AdminPostEditor({
  view,
  form,
  saving,
  saveSuccess,
  onChangeForm,
  onSave,
  onCancel,
}: AdminPostEditorProps) {
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCoverUpload(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const res = await fetch(`${UPLOAD_URL}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionStorage.getItem('admin_token') || '' },
          body: JSON.stringify({ image: base64, content_type: file.type }),
        });
        const data = await res.json();
        if (data.url) onChangeForm({ cover_url: data.url });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  }

  function insertMarkdown(before: string, after = "") {
    const textarea = document.getElementById("post-content") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.substring(start, end);
    const newText = form.content.substring(0, start) + before + selected + after + form.content.substring(end);
    onChangeForm({ content: newText });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }

  function handleTagChange(tag: string) {
    onChangeForm({ tag, color: TAG_COLORS[tag] || form.color });
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="w-9 h-9 glass border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all">
          <Icon name="ArrowLeft" size={16} className="text-white/60" />
        </button>
        <h2 className="font-oswald text-2xl font-bold text-white">
          {view === "new" ? "Новая статья" : "Редактировать статью"}
        </h2>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">

          {/* Title */}
          <div className="glass neon-border rounded-2xl p-5">
            <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Заголовок *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => onChangeForm({ title: e.target.value })}
              placeholder="Введите заголовок статьи..."
              className="w-full bg-transparent text-white text-xl font-semibold placeholder-white/20 outline-none"
            />
          </div>

          {/* Content editor */}
          <div className="glass neon-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setEditorTab("write")}
                className={`px-5 py-3 text-sm font-medium transition-all ${editorTab === "write" ? "text-white border-b-2 border-violet-500" : "text-white/40 hover:text-white"}`}
              >
                Редактор
              </button>
              <button
                onClick={() => setEditorTab("preview")}
                className={`px-5 py-3 text-sm font-medium transition-all ${editorTab === "preview" ? "text-white border-b-2 border-violet-500" : "text-white/40 hover:text-white"}`}
              >
                Превью
              </button>

              {editorTab === "write" && (
                <div className="ml-auto flex items-center gap-1 px-3">
                  <button onClick={() => insertMarkdown("## ")} title="Заголовок" className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white text-sm font-bold transition-all">H</button>
                  <button onClick={() => insertMarkdown("**", "**")} title="Жирный" className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white text-sm font-bold transition-all">B</button>
                  <button onClick={() => insertMarkdown("*", "*")} title="Курсив" className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white text-sm italic transition-all">I</button>
                  <button onClick={() => insertMarkdown("- ")} title="Список" className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white transition-all">
                    <Icon name="List" size={13} />
                  </button>
                  <button onClick={() => insertMarkdown("`", "`")} title="Код" className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white text-xs font-mono transition-all">{"`"}</button>
                </div>
              )}
            </div>

            {editorTab === "write" ? (
              <textarea
                id="post-content"
                rows={22}
                value={form.content}
                onChange={e => onChangeForm({ content: e.target.value })}
                placeholder={"Напишите текст статьи...\n\nПоддерживается Markdown:\n## Заголовок\n**жирный текст**\n- пункт списка\n`код`"}
                className="w-full bg-transparent text-white/80 px-5 py-4 outline-none text-sm resize-none font-mono placeholder-white/20 leading-relaxed"
              />
            ) : (
              <div className="px-5 py-4 min-h-[300px]">
                {form.content ? (
                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }}
                  />
                ) : (
                  <p className="text-white/20 text-sm italic">Нет текста для превью</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Publish panel */}
          <div className="glass neon-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
              <Icon name="Send" size={14} />
              Публикация
            </h3>

            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-xs text-white/50">Статус</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${form.published ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"}`}>
                {form.published ? "Опубликована" : "Черновик"}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => onSave(true)}
                disabled={saving || !form.title.trim()}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${saveSuccess && form.published ? "bg-emerald-600 text-white" : "btn-gradient text-white"} disabled:opacity-50`}
              >
                {saving ? (
                  <><Icon name="Loader2" size={15} className="animate-spin" /> Сохранение...</>
                ) : saveSuccess && form.published ? (
                  <><Icon name="Check" size={15} /> Опубликовано!</>
                ) : (
                  <><Icon name="Globe" size={15} /> Опубликовать</>
                )}
              </button>

              <button
                onClick={() => onSave(false)}
                disabled={saving || !form.title.trim()}
                className="w-full py-2.5 rounded-xl text-sm text-white/60 hover:text-white glass border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Icon name="FileText" size={15} />
                Сохранить как черновик
              </button>

              <button onClick={onCancel} className="w-full py-2 rounded-xl text-xs text-white/30 hover:text-white/60 transition-all">
                Отмена
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="glass neon-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
              <Icon name="Settings2" size={14} />
              Настройки
            </h3>

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
                onChange={e => onChangeForm({ read: e.target.value })}
                placeholder="5 мин"
                className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
              />
            </div>
          </div>

          {/* Cover image */}
          <div className="glass neon-border rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
              <Icon name="Image" size={14} />
              Обложка
            </h3>

            {form.cover_url ? (
              <div className="relative group rounded-xl overflow-hidden">
                <img src={form.cover_url} alt="Обложка" className="w-full h-32 object-cover" />
                <button
                  onClick={() => onChangeForm({ cover_url: null })}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <Icon name="X" size={13} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 glass border border-dashed border-white/20 hover:border-violet-500/50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <><Icon name="Loader2" size={18} className="text-white/40 animate-spin" /><span className="text-white/30 text-xs">Загрузка...</span></>
                ) : (
                  <><Icon name="Upload" size={18} className="text-white/40" /><span className="text-white/30 text-xs">Нажмите для загрузки</span></>
                )}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ''; }}
            />

            {form.cover_url && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-1.5 text-xs text-white/40 hover:text-white/70 transition-all"
              >
                Заменить
              </button>
            )}
          </div>

          {/* Preview card */}
          <div className="glass neon-border rounded-2xl p-5">
            <h3 className="font-semibold text-xs text-white/50 mb-3 uppercase tracking-wider">Как будет выглядеть</h3>
            <div className="glass rounded-xl overflow-hidden">
              <div className={`h-1 w-full bg-gradient-to-r ${form.color}`} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r ${form.color} text-white`}>{form.tag}</span>
                  <span className="text-white/30 text-xs">{form.read} чтения</span>
                </div>
                <p className="font-oswald font-semibold text-white text-sm leading-snug">
                  {form.title || <span className="text-white/20">Заголовок статьи</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}