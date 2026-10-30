import { useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import LeadForm from "./LeadForm";
import { REPORTS } from "./products";

export default function ReportsPage() {
  const [pick, setPick] = useState(REPORTS[0].id);
  const cur = REPORTS.find((r) => r.id === pick) ?? REPORTS[0];
  const choose = (id: string) => {
    setPick(id);
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <MShell active="/masshtab/otchety">
      <section className="bg-[#14110f] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-12 md:pb-16">
          <Crumbs dark items={[{ label: "Аналитические отчёты" }]} />
          <Kicker className="text-[#ff7a66] mt-8">Аналитика на заказ</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-3 leading-[1.05] max-w-4xl`}>Отчёт под ваше решение — с цифрами, источниками и выводом</h1>
          <p className="text-lg text-white/75 mt-4 max-w-2xl">Редакция «Масштаба» считает рынки, бенчмарки и юнит-экономику на открытых данных ФНС, Росстата, Банка России и ЕИС. Вы получаете не таблицу, а ответ: что делать и сколько это стоит.</p>
          <div className="flex flex-wrap gap-8 mt-8 text-sm text-white/70">
            <span className="flex items-center gap-2"><Icon name="Database" size={16} className="text-[#ff7a66]" />Отчётность ФНС, ЕИС, Банк России</span>
            <span className="flex items-center gap-2"><Icon name="BadgeCheck" size={16} className="text-[#ff7a66]" />Каждая цифра со ссылкой на источник</span>
            <span className="flex items-center gap-2"><Icon name="FileSpreadsheet" size={16} className="text-[#ff7a66]" />Расчёты в Excel в комплекте</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <section className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {REPORTS.map((r) => (
            <div key={r.id} className="bg-white border border-[#e2d9cb] rounded-lg p-6 flex flex-col">
              <Icon name={r.icon} size={28} className="text-[#d6402b]" />
              <div className="text-xs font-bold uppercase tracking-wider text-[#8a8278] mt-4">{r.who}</div>
              <h2 className={`${serif} font-bold text-xl mt-1 leading-tight`}>{r.t}</h2>
              <p className="text-sm text-[#5b5550] mt-2">{r.d}</p>
              <ul className="mt-4 space-y-1.5 text-sm flex-1">
                {r.gets.map((g) => <li key={g} className="flex gap-2"><Icon name="Check" size={15} className="text-[#d6402b] mt-0.5 shrink-0" />{g}</li>)}
              </ul>
              <div className="flex items-end justify-between mt-5 pt-4 border-t border-[#efe7da]">
                <div><div className="font-extrabold text-lg">{r.price}</div><div className="text-xs text-[#8a8278]">{r.term}</div></div>
                <button onClick={() => choose(r.id)} className="bg-[#14110f] hover:bg-[#d6402b] text-white text-sm font-bold px-4 py-2 rounded transition-colors">Заказать</button>
              </div>
            </div>
          ))}
        </section>
        <p className="text-xs text-[#8a8278] mt-3">Итоговая стоимость зависит от глубины выборки и числа отраслей — назовём её после короткого созвона, до начала работы.</p>

        <section id="order" className="mt-14 grid md:grid-cols-2 gap-10 items-start bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-10 scroll-mt-24">
          <div>
            <Kicker>Заказ отчёта</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>{cur.t}</h2>
            <p className="text-[#5b5550] mt-3">Опишите задачу: отрасль, регион и какое решение нужно принять. Аналитик свяжется в течение рабочего дня, уточнит детали и назовёт точную цену и срок.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {REPORTS.map((r) => (
                <button key={r.id} onClick={() => setPick(r.id)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${pick === r.id ? "bg-[#14110f] text-white border-[#14110f]" : "border-[#d9cfc0] hover:border-[#14110f]"}`}>{r.t}</button>
              ))}
            </div>
            <Link to="/masshtab/podpiska" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#d6402b] mt-6 hover:underline">Нужна аналитика регулярно? Корпоративная подписка<Icon name="ArrowRight" size={15} /></Link>
          </div>
          <LeadForm key={cur.id} kind="report" cta="Заказать отчёт" prefix={`Отчёт: ${cur.t}`} placeholder="Отрасль, регион и какое решение нужно принять" />
        </section>
      </div>
    </MShell>
  );
}
