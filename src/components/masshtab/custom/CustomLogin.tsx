import { useState } from "react";
import Icon from "@/components/ui/icon";
import { serif } from "../MShell";
import { pipesAuth, setToken } from "./customApi";

const field = "w-full bg-white border-2 border-[#14110f] rounded px-4 py-3 text-[#14110f] placeholder:text-[#8a8278] outline-none focus:border-[#d6402b]";

export default function CustomLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr("");
    const r = await pipesAuth("send_code", { email });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setStep("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await pipesAuth<{ token: string }>("verify", { email, code, source: "masshtab" });
    setBusy(false);
    if (r.error || !r.token) return setErr(r.error || "Не удалось войти");
    setToken(r.token);
    window.dispatchEvent(new Event("biz-auth"));
    onDone();
  };

  return (
    <div className="bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-8">
      <h2 className={`${serif} font-bold text-3xl`}>Вход в кабинет</h2>
      <p className="text-[#5b5550] mt-2 text-sm">Без пароля: пришлём код на почту. Новый кабинет создаётся автоматически. На эту же почту придёт чек об оплате.</p>
      {step === "email" ? (
        <form onSubmit={send} className="space-y-3 mt-5">
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.ru" className={field} />
          <button disabled={busy} className="w-full bg-[#d6402b] hover:bg-[#b93522] text-white font-bold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Mail" size={18} />}Получить код
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3 mt-5">
          <div className="text-sm text-[#5b5550]">Код отправлен на <b className="text-[#14110f]">{email}</b>. Если письма нет — проверьте «Спам».</div>
          <input inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className={`${field} text-center text-2xl tracking-[.5em] font-bold`} />
          <button disabled={busy || code.length < 6} className="w-full bg-[#d6402b] hover:bg-[#b93522] text-white font-bold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Icon name="Loader2" size={18} className="animate-spin" />}Войти
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => { setStep("email"); setCode(""); setErr(""); }} className="text-[#8a8278] hover:text-[#14110f]">Другой email</button>
            <button type="button" onClick={() => send()} disabled={busy} className="text-[#d6402b] font-semibold">Отправить ещё раз</button>
          </div>
        </form>
      )}
      {err && <p className="text-[#d6402b] text-sm mt-3">{err}</p>}
    </div>
  );
}
