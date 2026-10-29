import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, type Ad } from "@/components/masshtab/api";
import { inp, lbl, uploadImage } from "./upload";

const SLOTS: Record<Ad["slot"], string> = { top: "Баннер на главной (широкий)", side: "Боковой блок (рейтинг, главная, интервью)", inline: "Внутри интервью" };
const empty = (): Partial<Ad> => ({ slot: "side", advertiser: "", title: "", text: "", image_url: "", link: "https://", cta: "Подробнее", active: true });

export default function AdsTab({ token }: { token: string }) {
  const [list, setList] = useState<Ad[]>([]);
  const [form, setForm] = useState<Partial<Ad> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => mGet<{ ads: Ad[] }>({ action: "ads", all: 1 }, token).then((r) => setList(r.data?.ads ?? []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form) return;
    setBusy(true); setMsg("");
    const r = await mPost<{ ok: boolean }>({ action: "save_ad", ...form, link: form.link === "https://" ? "" : form.link }, token);
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    setForm(null); load();
  };
  const remove = async (id: number) => { if (confirm("Удалить рекламный блок?")) { await mPost({ action: "delete_ad", id }, token); setForm(null); load(); } };

  if (form) {
    const set = (k: keyof Ad, v: string | boolean) => setForm({ ...form, [k]: v });
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => setForm(null)} className="text-sm text-white/50 hover:text-white flex items-center gap-1.5"><Icon name="ArrowLeft" size={14} /> Все блоки</button>
        <div><label className={lbl}>Место</label>
          <select className={inp} value={form.slot} onChange={(e) => set("slot", e.target.value)}>{Object.entries(SLOTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Рекламодатель</label><input className={inp} value={form.advertiser} onChange={(e) => set("advertiser", e.target.value)} placeholder="ООО «Лизинг-Про»" /></div>
          <div><label className={lbl}>Текст кнопки</label><input className={inp} value={form.cta} onChange={(e) => set("cta", e.target.value)} /></div>
        </div>
        <div><label className={lbl}>Заголовок</label><input className={inp} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Лизинг оборудования с первым взносом от 5%" /></div>
        <div><label className={lbl}>Текст</label><textarea className={inp} rows={3} value={form.text} onChange={(e) => set("text", e.target.value)} /></div>
        <div><label className={lbl}>Ссылка</label><input className={inp} value={form.link} onChange={(e) => set("link", e.target.value)} /></div>
        <div>
          <label className={lbl}>Картинка</label>
          <div className="flex items-center gap-4">
            {form.image_url && <img src={form.image_url} alt="" className="w-40 h-24 object-cover rounded-lg" />}
            <label className="cursor-pointer text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 hover:bg-white/10">
              {busy ? "Загрузка…" : "Загрузить"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return; setBusy(true);
                const url = await uploadImage(f, token); setBusy(false);
                if (url) set("image_url", url); else setMsg("Не удалось загрузить картинку");
              }} />
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} /> Показывать на сайте</label>
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
      <button onClick={() => setForm(empty())} className="mb-5 bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2"><Icon name="Plus" size={15} /> Новый рекламный блок</button>
      {!list.length && <div className="text-white/40 text-sm">Рекламы пока нет — на сайте показываются блоки «Здесь может быть ваша компания» со ссылкой на условия размещения.</div>}
      <div className="space-y-2">
        {list.map((a) => (
          <button key={a.id} onClick={() => setForm(a)} className="w-full text-left bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-white/20 flex items-center gap-4">
            {a.image_url ? <img src={a.image_url} alt="" className="w-16 h-12 object-cover rounded" /> : <div className="w-16 h-12 rounded bg-white/5" />}
            <div className="flex-1 min-w-0"><div className="font-semibold truncate">{a.title || a.advertiser}</div><div className="text-xs text-white/40">{SLOTS[a.slot]} · {a.advertiser}</div></div>
            <span className="text-xs text-white/50">{a.clicks ?? 0} переходов</span>
            <span className={`text-xs px-2 py-1 rounded-full ${a.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>{a.active ? "Показывается" : "Выключен"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
