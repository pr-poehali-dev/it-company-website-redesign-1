import { useState } from "react";
import Icon from "@/components/ui/icon";
import { api, setToken } from "./pipesApi";

export default function PipesLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr("");
    const r = await api("send_code", { email });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setStep("code");
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await api<{ token: string }>("verify", { email, code });
    setBusy(false);
    if (r.error || !r.token) return setErr(r.error || "Не удалось войти");
    setToken(r.token);
    onDone();
  };

  return (
    <div className="max-w-md mx-auto bg-white/[0.04] border border-violet-500/30 rounded-3xl p-7 md:p-9">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-5"><Icon name="Workflow" size={24} /></div>
      <h1 className="font-['Oswald',sans-serif] text-3xl font-bold mb-2">Вход в Конвейер данных</h1>
      <p className="text-white/55 text-sm mb-6">Без пароля: пришлём код на почту. Новый аккаунт создаётся автоматически — тариф «Старт» бесплатно.</p>
      {step === "email" ? (
        <form onSubmit={send} className="space-y-3">
          <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.ru"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-violet-400" />
          <button disabled={busy} className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:brightness-110 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Mail" size={18} />}Получить код
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <div className="text-sm text-white/60">Код отправлен на <span className="text-white">{email}</span>. Проверьте папку «Спам», если письма нет.</div>
          <input inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white text-center text-2xl tracking-[.5em] font-semibold placeholder:text-white/20 outline-none focus:border-violet-400" />
          <button disabled={busy || code.length < 6} className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:brightness-110 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Icon name="Loader2" size={18} className="animate-spin" />}Войти
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => { setStep("email"); setCode(""); setErr(""); }} className="text-white/50 hover:text-white">Другой email</button>
            <button type="button" onClick={() => send()} disabled={busy} className="text-violet-300 hover:text-white">Отправить ещё раз</button>
          </div>
        </form>
      )}
      {err && <p className="text-rose-300 text-sm mt-3">{err}</p>}
    </div>
  );
}
