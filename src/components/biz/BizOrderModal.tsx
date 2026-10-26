import { useState } from "react";
import Icon from "@/components/ui/icon";
import { bizOrder } from "./bizApi";
import { ymLead } from "@/lib/ym";

interface Props {
  reportType: "market" | "company" | "check" | "custom";
  reportKey?: string;
  title: string;
  price?: number;
  includes?: string[];
  onClose: () => void;
}

const field = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60";

export default function BizOrderModal({ reportType, reportKey = "", title, price, includes, onClose }: Props) {
  const [f, setF] = useState({ name: "", phone: "", email: "", company: "", inn: "", comment: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.name.trim() || !(f.phone.trim() || f.email.trim())) return setError("Укажите имя и телефон или email");
    if (!agree) return setError("Нужно согласие на обработку персональных данных");
    setState("sending");
    const r = await bizOrder({ ...f, report_type: reportType, report_key: reportKey, report_title: title }).catch(() => ({ error: "Нет связи, попробуйте ещё раз" }));
    if (r.error) { setError(r.error); setState("idle"); return; }
    ymLead("biz_order", { reportType });
    setOrderId(r.order_id);
    setState("done");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#10101c] border border-white/10 rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
        {state === "done" ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-4"><Icon name="Check" size={26} className="text-emerald-300" /></div>
            <div className="font-semibold text-white text-lg mb-1">Заказ №{orderId} принят</div>
            <p className="text-white/60 text-sm">Пришлём счёт и подготовим полный отчёт в течение рабочего дня после оплаты.</p>
            <button onClick={onClose} className="mt-5 text-sm text-violet-300 hover:text-white">Закрыть</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <div className="text-xs text-violet-300 uppercase tracking-wider mb-1">Полный отчёт</div>
              <div className="font-semibold text-white text-lg leading-snug pr-6">{title}</div>
              {price ? <div className="text-2xl font-bold text-white mt-2">{price.toLocaleString("ru-RU")} ₽ <span className="text-sm font-normal text-white/40">с НДС</span></div> : null}
            </div>
            {includes && (
              <ul className="space-y-1.5 py-1">
                {includes.map(t => <li key={t} className="flex gap-2 text-sm text-white/70"><Icon name="Check" size={15} className="text-emerald-300 shrink-0 mt-0.5" />{t}</li>)}
              </ul>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={f.name} onChange={set("name")} placeholder="Ваше имя *" className={field} />
              <input value={f.company} onChange={set("company")} placeholder="Компания" className={field} />
              <input value={f.phone} onChange={set("phone")} placeholder="Телефон" type="tel" className={field} />
              <input value={f.email} onChange={set("email")} placeholder="Email для отчёта" type="email" className={field} />
            </div>
            <input value={f.inn} onChange={set("inn")} placeholder="ИНН вашей компании — для счёта" className={field} />
            <textarea value={f.comment} onChange={set("comment")} rows={2} placeholder="Что важно учесть в отчёте" className={field} />
            <input value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <label className="flex items-start gap-2 text-xs text-white/55 cursor-pointer">
              <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 accent-violet-500" />
              <span>Даю согласие ООО «МАТ-Лабс» на обработку персональных данных для выставления счёта и отправки отчёта</span>
            </label>
            {error && <div className="text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={state === "sending"}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-6 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
              {state === "sending" ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="FileText" size={18} />}
              Заказать и получить счёт
            </button>
            <p className="text-[11px] text-white/35 text-center">Оплата по счёту для юрлиц и ИП. Отчёт — PDF и Excel на почту.</p>
          </form>
        )}
      </div>
    </div>
  );
}
