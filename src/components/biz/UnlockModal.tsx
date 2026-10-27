import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import PipesLogin from "@/components/pipes/PipesLogin";
import BizOrderModal from "./BizOrderModal";
import { PRICES, bizPost, userToken } from "./bizApi";
import { ymLead } from "@/lib/ym";

interface Props {
  kind: "company" | "market";
  unlockKey: string;
  title: string;
  onUnlocked: () => void;
  onClose: () => void;
}

const WHAT = {
  company: { head: "Полный отчёт о компании — бесплатно", text: "Войдите по email — откроем руководителя, полный адрес, всех конкурентов с ИНН. Бесплатно 3 отчёта, в подписке — без ограничений." },
  market: { head: "Первый отчёт о рынке — бесплатно", text: "Войдите по email — откроем топ-50 компаний рынка с ИНН и долями. Первый отчёт в подарок, дальше — в подписке или разово." },
};

export default function UnlockModal({ kind, unlockKey, title, onUnlocked, onClose }: Props) {
  const [step, setStep] = useState<"login" | "busy" | "limit" | "order">(userToken() ? "busy" : "login");
  const [err, setErr] = useState("");
  const [order, setOrder] = useState<"pro" | "market" | null>(null);

  const run = async () => {
    setStep("busy"); setErr("");
    const r = await bizPost<{ ok: boolean }>({ action: "unlock", kind, key: unlockKey });
    if (r.ok) { ymLead("biz_unlock", { kind }); onUnlocked(); onClose(); return; }
    if (r.upgrade) { setErr(r.error || ""); setStep("limit"); return; }
    if (!userToken()) { setStep("login"); return; }
    setErr(r.error || "Не удалось открыть отчёт"); setStep("limit");
  };

  useEffect(() => { if (userToken()) run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (order) {
    return order === "pro"
      ? <BizOrderModal reportType="pro" title="Подписка «Аналитика Про» — 1 месяц" price={PRICES.pro} includes={PRO_INCLUDES} onClose={onClose} />
      : <BizOrderModal reportType="market" reportKey={unlockKey} title={title} price={PRICES.market} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#10101c] border border-white/10 rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
        {step === "login" && (
          <>
            <div className="text-xs text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Icon name="Gift" size={13} />Без оплаты и карты</div>
            <PipesLogin bare source="analytics" title={WHAT[kind].head} text={WHAT[kind].text} onDone={run} />
          </>
        )}
        {step === "busy" && <div className="py-12 flex flex-col items-center gap-3 text-white/60"><Icon name="Loader2" size={28} className="animate-spin text-violet-300" />Открываем отчёт…</div>}
        {step === "limit" && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-4"><Icon name="Zap" size={22} className="text-amber-300" /></div>
            <div className="text-xl font-semibold text-white mb-1">Бесплатные отчёты закончились</div>
            <p className="text-sm text-white/60 mb-5">{err}</p>
            <div className="bg-gradient-to-b from-violet-600/25 to-violet-600/5 border border-violet-500/50 rounded-2xl p-4 mb-3">
              <div className="flex items-baseline justify-between mb-2"><span className="font-semibold text-white">Аналитика Про</span><span className="font-['Oswald',sans-serif] text-2xl font-bold text-white">{PRICES.pro.toLocaleString("ru-RU")} ₽<span className="text-sm text-white/45 font-normal">/мес</span></span></div>
              <ul className="space-y-1.5 mb-4">{PRO_INCLUDES.map(t => <li key={t} className="flex gap-2 text-xs text-white/75"><Icon name="Check" size={14} className="text-emerald-300 shrink-0" />{t}</li>)}</ul>
              <button onClick={() => setOrder("pro")} className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 py-3 rounded-xl text-sm font-semibold text-white">Подключить подписку</button>
            </div>
            {kind === "market" && <button onClick={() => setOrder("market")} className="w-full border border-white/15 hover:bg-white/5 py-2.5 rounded-xl text-sm text-white">Купить только этот отчёт — {PRICES.market.toLocaleString("ru-RU")} ₽</button>}
            <Link to="/analytics/prices" className="block text-center text-xs text-violet-300 hover:text-white mt-3">Сравнить тарифы</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export const PRO_INCLUDES = [
  "Отчёты о компаниях — без ограничений",
  "3 отчёта о рынках каждый месяц",
  "Слежение за 30 контрагентами с письмами об изменениях",
  "Рейтинги топ-100 по любой отрасли и региону",
];
