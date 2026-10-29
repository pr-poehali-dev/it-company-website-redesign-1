import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { fmtDate, mGet, mPost, type Post } from "@/components/masshtab/api";
import { inp, lbl, uploadImage } from "./upload";

type Form = {
  id?: number; kind: Post["kind"]; rubric: string; title: string; lead: string; hero_name: string; hero_role: string;
  company_inn: string; cover_url: string; content: string; author: string; published: boolean; slug?: string;
};
const empty = (): Form => ({ kind: "interview", rubric: "Люди", title: "", lead: "", hero_name: "", hero_role: "", company_inn: "", cover_url: "", content: "", author: "Редакция «Масштаба»", published: false });
const RUBRICS = ["Люди", "Компании", "Рынки", "Деньги", "Управление", "Технологии", "Своё дело"];
const HINT = `**— Вопрос журналиста?**

Ответ героя обычным абзацем.

> Яркая цитата крупным шрифтом

## Подзаголовок`;

export default function PostsTab({ token }: { token: string }) {
  const [list, setList] = useState<Post[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => mGet<{ posts: Post[] }>({ action: "posts", all: 1 }, token).then((r) => setList(r.data?.posts ?? []));
  useEffect(() => { load(); }, []);

  const edit = async (p: Post) => {
    const r = await mGet<{ post: Post & { content: string } }>({ action: "post", slug: p.slug }, token);
    const x = r.data?.post;
    if (!x) return;
    setForm({ id: x.id, slug: x.slug, kind: x.kind, rubric: x.rubric, title: x.title, lead: x.lead, hero_name: x.hero_name, hero_role: x.hero_role,
      company_inn: x.company_inn || "", cover_url: x.cover_url || "", content: x.content, author: x.author, published: x.published });
    setMsg("");
  };

  const save = async (publish?: boolean) => {
    if (!form) return;
    setBusy(true); setMsg("");
    const body = { ...form, published: publish ?? form.published };
    const r = await mPost<{ ok: boolean; id: number; slug: string }>({ action: "save_post", ...body }, token);
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    setForm({ ...body, id: r.id, slug: r.slug });
    setMsg(body.published ? "Опубликовано" : "Черновик сохранён");
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Удалить материал без возможности восстановления?")) return;
    await mPost({ action: "delete_post", id }, token);
    setForm(null); load();
  };

  if (form) {
    const set = (k: keyof Form, v: string | boolean) => setForm({ ...form, [k]: v });
    return (
      <div className="space-y-5 max-w-4xl">
        <button onClick={() => { setForm(null); load(); }} className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"><Icon name="ArrowLeft" size={14} /> Все материалы</button>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><label className={lbl}>Формат</label>
            <select className={inp} value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="interview">Интервью</option><option value="article">Статья</option><option value="partner">Партнёрский материал</option>
            </select></div>
          <div><label className={lbl}>Рубрика</label>
            <select className={inp} value={form.rubric} onChange={(e) => set("rubric", e.target.value)}>{RUBRICS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label className={lbl}>Автор</label><input className={inp} value={form.author} onChange={(e) => set("author", e.target.value)} /></div>
        </div>
        <div><label className={lbl}>Заголовок *</label><input className={`${inp} text-lg font-semibold`} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="«Мы выросли в 10 раз, когда перестали бояться госзаказа»" /></div>
        <div><label className={lbl}>Подзаголовок (лид)</label><textarea className={inp} rows={2} value={form.lead} onChange={(e) => set("lead", e.target.value)} placeholder="Основатель компании из рейтинга «Масштаб-500» — о том, как…" /></div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><label className={lbl}>Герой</label><input className={inp} value={form.hero_name} onChange={(e) => set("hero_name", e.target.value)} placeholder="Иван Петров" /></div>
          <div><label className={lbl}>Должность и компания</label><input className={inp} value={form.hero_role} onChange={(e) => set("hero_role", e.target.value)} placeholder="основатель «Техполимера»" /></div>
          <div><label className={lbl}>ИНН компании — для карточки с цифрами</label><input className={inp} value={form.company_inn} onChange={(e) => set("company_inn", e.target.value)} placeholder="7701234567" /></div>
        </div>
        <div>
          <label className={lbl}>Фото героя / обложка</label>
          <div className="flex items-center gap-4">
            {form.cover_url && <img src={form.cover_url} alt="" className="w-40 h-24 object-cover rounded-lg" />}
            <label className="cursor-pointer text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 hover:bg-white/10">
              {busy ? "Загрузка…" : form.cover_url ? "Заменить фото" : "Загрузить фото"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return; setBusy(true);
                const url = await uploadImage(f, token); setBusy(false);
                if (url) set("cover_url", url); else setMsg("Не удалось загрузить фото");
              }} />
            </label>
            {form.cover_url && <button onClick={() => set("cover_url", "")} className="text-xs text-white/40 hover:text-red-300">Убрать</button>}
          </div>
        </div>
        <div>
          <label className={lbl}>Текст. Вопрос — жирным через **…**, цитата — строка с «&gt; », подзаголовок — «## ». Абзацы разделяйте пустой строкой.</label>
          <textarea className={`${inp} font-mono leading-relaxed`} rows={22} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder={HINT} />
        </div>
        {msg && <div className={`text-sm ${msg.includes("Не") || msg.includes("Укаж") ? "text-red-300" : "text-emerald-300"}`}>{msg}</div>}
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => save(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">{form.published ? "Сохранить" : "Опубликовать"}</button>
          <button disabled={busy} onClick={() => save(false)} className="bg-white/10 hover:bg-white/15 px-5 py-2.5 rounded-lg disabled:opacity-50">{form.published ? "Снять с публикации" : "Сохранить черновик"}</button>
          {form.slug && <a href={`/masshtab/${form.slug}`} target="_blank" rel="noopener" className="px-5 py-2.5 rounded-lg border border-white/10 text-sm flex items-center gap-1.5"><Icon name="Eye" size={14} />{form.published ? "Открыть" : "Предпросмотр"}</a>}
          {form.id && <button onClick={() => remove(form.id!)} className="ml-auto text-sm text-red-300/70 hover:text-red-300">Удалить</button>}
        </div>
        {!form.published && form.slug && <p className="text-xs text-white/40">Черновик виден по ссылке только после публикации. Предпросмотр откроется, если материал опубликован.</p>}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => { setForm(empty()); setMsg(""); }} className="mb-5 bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2"><Icon name="Plus" size={15} /> Новое интервью</button>
      {!list.length && <div className="text-white/40 text-sm">Материалов пока нет. Создайте первое интервью — оно появится на главной листка.</div>}
      <div className="space-y-2">
        {list.map((p) => (
          <button key={p.id} onClick={() => edit(p)} className="w-full text-left bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-white/20 flex items-center gap-4">
            {p.cover_url ? <img src={p.cover_url} alt="" className="w-16 h-12 object-cover rounded" /> : <div className="w-16 h-12 rounded bg-white/5" />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.title}</div>
              <div className="text-xs text-white/40">{p.kind === "interview" ? "Интервью" : p.kind === "partner" ? "Партнёрский" : "Статья"} · {p.rubric}{p.hero_name ? ` · ${p.hero_name}` : ""}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${p.published ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>{p.published ? fmtDate(p.published_at) : "Черновик"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
