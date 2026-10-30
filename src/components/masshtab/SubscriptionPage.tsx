import { useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import LeadForm from "./LeadForm";
import { PLAN_FOR, PLANS } from "./products";

export default function SubscriptionPage() {
  const [pick, setPick] = useState(PLANS[1].id);
  const cur = PLANS.find((p) => p.id === pick) ?? PLANS[1];
  const choose = (id: string) => {
    setPick(id);
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <MShell active="/masshtab/podpiska">
      <section className="bg-[#0b1a33] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-12 md:pb-16">
          <Crumbs dark items={[{ label: "Корпоративная подписка" }]} />
          <Kicker className="text-[#c9a24a] mt-8">Корпоративная подписка</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-3 leading-[1.05] max-w-4xl`}>Аналитический отдел по цене одной ставки стажёра</h1>
          <p className="text-lg text-white/75 mt-4 max-w-2xl">Закрытые отраслевые отчёты, бенчмарки и сценарии для бюджета каждый месяц — для финансовой службы, стратегии и инвестиционных решений.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <section className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_FOR.map((x) => (
            <div key={x.t} className="bg-white border border-[#e2d9cb] rounded-lg p-5">
              <Icon name={x.icon} size={24} className="text-[#d6402b]" />
              <div className="font-bold mt-3">{x.t}</div>
              <p className="text-sm text-[#5b5550] mt-1">{x.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Тарифы</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {PLANS.map((p) => (
              <div key={p.id} className={`rounded-lg p-6 flex flex-col ${p.accent ? "bg-[#14110f] text-white ring-2 ring-[#d6402b]" : "bg-white border border-[#e2d9cb]"}`}>
                {p.accent && <div className="self-start text-[11px] font-extrabold uppercase tracking-wider bg-[#d6402b] text-white px-2 py-0.5 rounded mb-3">Чаще выбирают</div>}
                <div className={`${serif} font-bold text-2xl`}>{p.t}</div>
                <div className={`text-sm ${p.accent ? "text-white/60" : "text-[#8a8278]"}`}>{p.note}</div>
                <div className="font-extrabold text-2xl mt-4">{p.p}</div>
                <ul className="mt-4 space-y-2 text-sm flex-1">
                  {p.items.map((i) => <li key={i} className="flex gap-2"><Icon name="Check" size={15} className={`mt-0.5 shrink-0 ${p.accent ? "text-[#ff7a66]" : "text-[#d6402b]"}`} />{i}</li>)}
                </ul>
                <button onClick={() => choose(p.id)} className={`mt-6 font-bold py-2.5 rounded transition-colors ${p.accent ? "bg-[#d6402b] hover:bg-[#b93522] text-white" : "bg-[#14110f] hover:bg-[#d6402b] text-white"}`}>Оформить</button>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#8a8278] mt-3">Оплата по счёту для юрлица, договор и закрывающие документы. При оплате за год — скидка 15%.</p>
        </section>

        <section id="order" className="mt-14 grid md:grid-cols-2 gap-10 items-start bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-10 scroll-mt-24">
          <div>
            <Kicker>Заявка на подписку</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>Тариф «{cur.t}»</h2>
            <p className="text-[#5b5550] mt-3">Укажите отрасли, которые важны вашей компании. Пришлём пример закрытого отчёта и договор.</p>
            <div className="flex gap-2 mt-5">
              {PLANS.map((p) => (
                <button key={p.id} onClick={() => setPick(p.id)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${pick === p.id ? "bg-[#14110f] text-white border-[#14110f]" : "border-[#d9cfc0] hover:border-[#14110f]"}`}>{p.t}</button>
              ))}
            </div>
            <Link to="/masshtab/otchety" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#d6402b] mt-6 hover:underline">Нужен разовый отчёт? Аналитика на заказ<Icon name="ArrowRight" size={15} /></Link>
          </div>
          <LeadForm key={cur.id} kind="corporate" cta="Получить пример отчёта и договор" prefix={`Тариф: ${cur.t} (${cur.p})`} placeholder="Какие отрасли и задачи важны: бюджет, стратегия, инвестиции" />
        </section>
      </div>
    </MShell>
  );
}
