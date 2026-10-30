import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, type Quote } from "@/components/masshtab/api";
import { inp, lbl } from "./upload";

const empty = (): Partial<Quote> => ({ text: "", author: "", author_role: "", source: "", comment: "", show_date: "", active: true });

export default function QuotesTab({ token }: { token: string }) {
  const [list, setList] = useState<Quote[]>([]);
  const [today, setToday] = useState("");
  const [form, setForm] = useState<Partial<Quote> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => mGet<{ quotes: Quote[]; today: string }>({ action: "quotes" }, token).then((r) => { setList(r.data?.quotes ?? []); setToday(r.data?.today ?? ""); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form) return;
    setBusy(true); setMsg("");
    const r = await mPost<{ ok: boolean }>({ action: "save_quote", ...form }, token);
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    setForm(null); load();
  };
  const remove = async (id: number) => {
    if (!confirm("Удалить цитату? Если она уже показывалась, она останется в архиве, но больше не будет выходить.")) return;
    await mPost({ action: "delete_quote", id }, token); setForm(null); load();
  };

  if (form) {
    const set = (k: keyof Quote, v: string | boolean) => setForm({ ...form, [k]: v });
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => setForm(null)} className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"><Icon name="ArrowLeft" size={14} /> Все цитаты</button>
        <div><label className={lbl}>Цитата</label><textarea className={inp} rows={3} value={form.text} onChange={(e) => set("text", e.target.value)} placeholder="Без кавычек — они добавятся автоматически" /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Автор</label><input className={inp} value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Питер Друкер" /></div>
          <div><label className={lbl}>Кто это</label><input className={inp} value={form.author_role} onChange={(e) => set("author_role", e.target.value)} placeholder="теоретик менеджмента" /></div>
        </div>
        <div><label className={lbl}>Источник</label><input className={inp} value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="книга, интервью, год" /></div>
        <div><label className={lbl}>Комментарий редакции «Что это значит для бизнеса»</label><textarea className={inp} rows={3} value={form.comment} onChange={(e) => set("comment", e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Показать в конкретный день (необязательно)</label><input type="date" className={inp} value={form.show_date || ""} min={today} onChange={(e) => set("show_date", e.target.value)} /></div>
          <label className="flex items-end gap-2 text-sm pb-2.5"><input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} /> Участвует в показе</label>
        </div>
        <p className="text-xs text-white/40">Без даты цитата попадёт в очередь: каждый день выбирается та, что показывалась реже и давнее других.</p>
        {msg && <div className="text-sm text-red-300">{msg}</div>}
        <div className="flex gap-3">
          <button disabled={busy} onClick={save} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">Сохранить</button>
          {form.id && <button onClick={() => remove(form.id!)} className="ml-auto text-sm text-red-300/70 hover:text-red-300">Удалить</button>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-white/50">{list.filter((q) => q.active).length} цитат в очереди · новая выходит каждый день в 00:00 по Москве</div>
        <button onClick={() => setForm(empty())} className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"><Icon name="Plus" size={15} /> Добавить цитату</button>
      </div>
      <div className="space-y-2">
        {list.map((q) => (
          <button key={q.id} onClick={() => setForm({ ...q, show_date: q.show_date || "" })} className={`w-full text-left bg-white/5 hover:bg-white/10 rounded-xl p-4 ${q.active ? "" : "opacity-50"}`}>
            <div className="italic">«{q.text}»</div>
            <div className="text-xs text-white/50 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-white/80 font-semibold not-italic">{q.author}</span>
              {q.show_date && <span className="text-cyan-300">на {q.show_date}</span>}
              {q.last_shown === today && <span className="text-emerald-300">сегодня на сайте</span>}
              <span>показов: {q.shown ?? 0}</span>
              {!q.active && <span>скрыта</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
