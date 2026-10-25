import { useState } from "react";
import Icon from "@/components/ui/icon";
import { radarRequest } from "./radarApi";
import { ymLead } from "@/lib/ym";

interface Props {
  plan?: string;
  companyInn?: string;
  filters?: string;
  title?: string;
  onClose?: () => void;
}

const field = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60";

export default function RadarAccessForm({ plan = "", companyInn = "", filters = "", title, onClose }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", interest: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !(form.phone.trim() || form.email.trim())) {
      setError("Укажите имя и телефон или email");
      return;
    }
    if (!agree) {
      setError("Нужно согласие на обработку персональных данных");
      return;
    }
    setState("sending");
    const data = await radarRequest({ ...form, plan, company_inn: companyInn, filters }).catch(() => ({ error: "Нет связи, попробуйте ещё раз" }));
    if (data.error) {
      setError(data.error);
      setState("idle");
      return;
    }
    ymLead("radar_access", { plan });
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
          <Icon name="Check" size={26} className="text-emerald-300" />
        </div>
        <div className="font-semibold text-white text-lg mb-1">Заявка принята</div>
        <p className="text-white/60 text-sm">Откроем пробный доступ и свяжемся в течение рабочего дня.</p>
        {onClose && <button onClick={onClose} className="mt-5 text-sm text-violet-300 hover:text-white">Закрыть</button>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {title && <div className="font-semibold text-white text-lg">{title}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.name} onChange={set("name")} placeholder="Ваше имя *" className={field} />
        <input value={form.company} onChange={set("company")} placeholder="Компания" className={field} />
        <input value={form.phone} onChange={set("phone")} placeholder="Телефон" type="tel" className={field} />
        <input value={form.email} onChange={set("email")} placeholder="Email" type="email" className={field} />
      </div>
      <textarea value={form.interest} onChange={set("interest")} rows={2}
        placeholder="Кого ищете: отрасль, регион, что продаёте" className={field} />
      <input value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="flex items-start gap-2 text-xs text-white/55 cursor-pointer">
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 accent-violet-500" />
        <span>Даю согласие ООО «МАТ-Лабс» на обработку персональных данных для связи по заявке</span>
      </label>
      {error && <div className="text-sm text-red-300">{error}</div>}
      <button type="submit" disabled={state === "sending"}
        className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-colors px-6 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
        {state === "sending" ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="LockOpen" size={18} />}
        Получить пробный доступ на 3 дня
      </button>
    </form>
  );
}
