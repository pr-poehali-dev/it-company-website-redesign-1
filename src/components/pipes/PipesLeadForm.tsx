import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "./pipesApi";

interface Props { plan: string; email?: string; title?: string; onDone?: () => void }

export default function PipesLeadForm({ plan, email, title, onDone }: Props) {
  const [f, setF] = useState({ name: "", contact: email || "", company: "", sources: "", comment: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await api("lead", { ...f, plan });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setSent(true);
  };

  if (sent) return (
    <div className="text-center py-6">
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-3"><Icon name="CheckCircle2" size={28} className="text-emerald-300" /></div>
      <div className="text-lg font-semibold text-white mb-1">Заявка отправлена</div>
      <p className="text-sm text-white/60 mb-4">Свяжемся в течение рабочего дня, разберём ваши системы и предложим схему подключения.</p>
      {onDone && <button onClick={onDone} className="text-sm text-violet-300 hover:text-white">Закрыть</button>}
    </div>
  );

  const cls = "w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400";
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-xl font-semibold text-white">{title || `Тариф «${plan}»`}</div>
      <p className="text-sm text-white/55 -mt-1">Оставьте контакты — включим тариф или подготовим план внедрения под ваши системы.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={f.name} onChange={set("name")} placeholder="Имя" className={cls} />
        <input required value={f.contact} onChange={set("contact")} placeholder="Телефон или email *" className={cls} />
      </div>
      <input value={f.company} onChange={set("company")} placeholder="Компания" className={cls} />
      <input value={f.sources} onChange={set("sources")} placeholder="Какие системы подключить: 1С, amoCRM, WB…" className={cls} />
      <textarea rows={2} value={f.comment} onChange={set("comment")} placeholder="Что хотите видеть в отчётах" className={cls} />
      <button disabled={busy} className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Icon name="Loader2" size={17} className="animate-spin" /> : <Icon name="Send" size={17} />}Отправить заявку
      </button>
      {err && <p className="text-rose-300 text-sm">{err}</p>}
      <p className="text-[11px] text-white/35">Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p>
    </form>
  );
}
