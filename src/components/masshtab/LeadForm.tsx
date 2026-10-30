import { useState } from "react";
import { mPost } from "./api";

export type LeadKind = "ad" | "hero" | "rating" | "subscribe" | "report" | "corporate" | "calc";

export default function LeadForm({ kind, cta, placeholder, prefix = "", initialMessage = "" }: { kind: LeadKind; cta: string; placeholder: string; prefix?: string; initialMessage?: string }) {
  const [f, setF] = useState({ name: "", company: "", contact: "", message: initialMessage });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (f.contact.trim().length < 5) { setErr("Укажите телефон или email"); return; }
    setState("sending");
    const r = await mPost<{ ok: boolean }>({ action: "lead", kind, ...f, message: prefix ? `${prefix}\n${f.message}`.trim() : f.message });
    if (r.error) { setErr(r.error); setState("idle"); return; }
    setState("done");
  };
  if (state === "done") {
    return <div className="bg-white border border-[#e2d9cb] rounded-lg p-6 text-center"><div className="font-bold text-lg">Заявка отправлена</div><p className="text-sm text-[#5b5550] mt-1">Редакция свяжется с вами в течение рабочего дня.</p></div>;
  }
  const inp = "w-full bg-white border border-[#d9cfc0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#14110f]";
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={inp} placeholder="Ваше имя" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inp} placeholder="Компания" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
      </div>
      <input className={inp} placeholder="Телефон или email *" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
      <textarea className={inp} rows={3} placeholder={placeholder} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      {err && <div className="text-sm text-[#d6402b]">{err}</div>}
      <button disabled={state === "sending"} className="w-full bg-[#d6402b] hover:bg-[#b93522] text-white font-bold py-3 rounded transition-colors disabled:opacity-60">
        {state === "sending" ? "Отправляем…" : cta}
      </button>
      <p className="text-[11px] text-[#8a8278]">Нажимая кнопку, вы соглашаетесь на обработку контактных данных для ответа на заявку.</p>
    </form>
  );
}
