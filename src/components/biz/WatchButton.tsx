import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import PipesLogin from "@/components/pipes/PipesLogin";
import { bizPost, userToken } from "./bizApi";
import { useBizAccount } from "./useBizAccount";

export default function WatchButton({ inn }: { inn: string }) {
  const { me, reload } = useBizAccount();
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  const [msg, setMsg] = useState("");
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(!!me?.watch.some(w => w.inn === inn)); }, [me, inn]);

  const toggle = async () => {
    if (!userToken()) { setLogin(true); return; }
    setBusy(true); setMsg("");
    const r = await bizPost({ action: on ? "watch_remove" : "watch_add", inn });
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    setOn(!on);
    reload();
  };

  return (
    <>
      <button onClick={toggle} disabled={busy}
        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 ${on ? "bg-cyan-500/15 border border-cyan-400/40 text-cyan-100" : "bg-white/5 border border-white/15 text-white hover:bg-white/10"}`}>
        <Icon name={busy ? "Loader2" : on ? "BellRing" : "Bell"} size={15} className={busy ? "animate-spin" : ""} />{on ? "Вы следите · отключить" : "Следить бесплатно"}
      </button>
      {me && <div className="text-[11px] text-white/40 mt-1.5 text-center">Слежение: {me.usage.watch.used} из {me.usage.watch.limit} · <Link to="/analytics/account" className="hover:text-white underline">список</Link></div>}
      {msg && <p className="text-xs text-amber-200 mt-2">{msg} <Link to="/analytics/prices" className="underline">Тарифы</Link></p>}
      {login && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLogin(false)} />
          <div className="relative w-full max-w-md bg-[#10101c] border border-white/10 rounded-2xl p-6">
            <button onClick={() => setLogin(false)} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
            <PipesLogin bare source="analytics" title="Слежение за контрагентом" text="Войдите по email — пришлём письмо, если у компании сменится статус, руководитель, адрес или появится долг. Бесплатно до 3 компаний."
              onDone={() => { setLogin(false); setTimeout(toggle, 50); }} />
          </div>
        </div>
      )}
    </>
  );
}
