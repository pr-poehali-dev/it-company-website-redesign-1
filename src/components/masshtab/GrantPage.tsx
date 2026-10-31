import { useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import LeadForm from "./LeadForm";

const PACKS = [
  { id: "start", t: "Рынок", p: "от 35 000 ₽", term: "5–7 рабочих дней", items: ["Объём рынка TAM/SAM/SOM с источниками", "10–20 конкурентов с выручкой и динамикой по ФНС", "Текст раздела «Рынок» для заявки", "Таблица расчётов в Excel"] },
  { id: "plan", t: "Рынок и экономика", p: "от 70 000 ₽", term: "7–10 рабочих дней", accent: true, items: ["Всё из пакета «Рынок»", "Юнит-экономика продукта и модель выручки на 3–5 лет", "Расчёт показателей, которые просит фонд: выручка, рабочие места, налоги", "Обоснование потенциала масштабирования"] },
  { id: "full", t: "Под ключ", p: "от 120 000 ₽", term: "10–15 рабочих дней", items: ["Всё из пакета «Рынок и экономика»", "Проверка соответствия требованиям конкурса", "Вычитка заявки целиком", "Ответы на замечания экспертов после первой подачи"] },
];

const MISTAKES = [
  ["Рынок «в целом»", "«Рынок ИИ в России — 1 трлн ₽» не убеждает. Эксперту нужен рынок, который вы реально можете занять, и как вы его посчитали."],
  ["Нет конкурентов", "«Аналогов нет» читается как «не искали». Сильная заявка показывает конкурентов и объясняет, чем вы лучше в цифрах."],
  ["Выручка без модели", "График «x10 за три года» без цены, числа клиентов и стоимости привлечения эксперт не примет всерьёз."],
  ["Цифры без источников", "Каждая цифра должна быть проверяемой: отчётность ФНС, Росстат, ЕИС, отраслевые исследования."],
];

export default function GrantPage() {
  const [pick, setPick] = useState("plan");
  const cur = PACKS.find((p) => p.id === pick) ?? PACKS[1];
  const choose = (id: string) => { setPick(id); document.getElementById("order")?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <MShell active="/masshtab/otchety">
      <section className="bg-[#0b1a33] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-12 md:pb-16">
          <Crumbs dark items={[{ label: "Аналитические отчёты", to: "/masshtab/otchety" }, { label: "Расчёты для ФСИ и Сколково" }]} />
          <Kicker className="text-[#c9a24a] mt-8">Под заявку на грант</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-3 leading-[1.05] max-w-4xl`}>Расчёт рынка и экономики для заявки в ФСИ и Сколково</h1>
          <p className="text-lg text-white/75 mt-4 max-w-2xl">Раздел «Рынок» и финансовая модель — то, на чём чаще всего теряют баллы технологические команды. Мы считаем их на открытых данных ФНС, Росстата и ЕИС, со ссылкой на каждый источник.</p>
          <p className="text-xs text-white/50 mt-6 max-w-2xl">Мы готовим расчёты и тексты для заявки. Решение о поддержке принимает фонд — результат конкурса мы не гарантируем.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Где заявки теряют баллы</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {MISTAKES.map(([t, d]) => (
              <div key={t} className="bg-white border border-[#e2d9cb] rounded-lg p-5 flex gap-4">
                <Icon name="CircleAlert" size={22} className="text-[#d6402b] shrink-0 mt-0.5" />
                <div><div className="font-bold">{t}</div><p className="text-sm text-[#5b5550] mt-1">{d}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Пакеты</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {PACKS.map((p) => (
              <div key={p.id} className={`rounded-lg p-6 flex flex-col ${p.accent ? "bg-[#14110f] text-white ring-2 ring-[#c9a24a]" : "bg-white border border-[#e2d9cb]"}`}>
                {p.accent && <div className="self-start text-[11px] font-extrabold uppercase tracking-wider bg-[#c9a24a] text-[#14110f] px-2 py-0.5 rounded mb-3">Чаще выбирают</div>}
                <div className={`${serif} font-bold text-2xl`}>{p.t}</div>
                <div className="font-extrabold text-2xl mt-3">{p.p}</div>
                <div className={`text-sm ${p.accent ? "text-white/60" : "text-[#8a8278]"}`}>{p.term}</div>
                <ul className="mt-4 space-y-2 text-sm flex-1">
                  {p.items.map((i) => <li key={i} className="flex gap-2"><Icon name="Check" size={15} className={`mt-0.5 shrink-0 ${p.accent ? "text-[#c9a24a]" : "text-[#d6402b]"}`} />{i}</li>)}
                </ul>
                <button onClick={() => choose(p.id)} className={`mt-6 font-bold py-2.5 rounded transition-colors ${p.accent ? "bg-[#c9a24a] hover:bg-[#b38d38] text-[#14110f]" : "bg-[#14110f] hover:bg-[#d6402b] text-white"}`}>Заказать</button>
              </div>
            ))}
          </div>
        </section>

        <section id="order" className="mt-14 grid md:grid-cols-2 gap-10 items-start bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-10 scroll-mt-24">
          <div>
            <Kicker>Заявка</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>Пакет «{cur.t}»</h2>
            <p className="text-[#5b5550] mt-3">Напишите, в какой фонд и конкурс подаёте, о чём продукт и к какой дате нужна заявка. Ответим в течение рабочего дня и скажем, успеваем ли к сроку.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {PACKS.map((p) => (
                <button key={p.id} onClick={() => setPick(p.id)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${pick === p.id ? "bg-[#14110f] text-white border-[#14110f]" : "border-[#d9cfc0] hover:border-[#14110f]"}`}>{p.t}</button>
              ))}
            </div>
            <Link to="/masshtab/otchety" className="inline-block text-sm font-bold text-[#d6402b] mt-6 hover:underline">Все аналитические отчёты →</Link>
          </div>
          <LeadForm key={cur.id} kind="report" cta="Отправить заявку" prefix={`Грант ФСИ/Сколково, пакет «${cur.t}» (${cur.p})`} placeholder="Фонд и конкурс, о чём продукт, срок подачи" />
        </section>
      </div>
    </MShell>
  );
}
