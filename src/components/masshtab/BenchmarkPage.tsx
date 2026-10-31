import { useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import LeadForm from "./LeadForm";

const METRICS = [
  ["MousePointerClick", "Цена клика", "Медиана и разброс по нишам и регионам, поиск и РСЯ отдельно"],
  ["Percent", "Конверсия в заявку и в оплату", "От клика до заявки и от заявки до денег"],
  ["Wallet", "Стоимость клиента (CAC)", "Сколько стоит покупатель, а не просто заявка"],
  ["Repeat", "LTV и повторные покупки", "Сколько клиент приносит за год и за всё время"],
  ["ShoppingCart", "Маркетплейсы", "Доля рекламы в выручке продавца, комиссии и логистика"],
  ["CalendarRange", "Сезонность", "Как меняются цена клика и конверсия по месяцам"],
] as const;

const NICHES = ["Стройматериалы и ремонт", "Мебель", "Детские товары", "Одежда и обувь", "Электроника", "Товары для дома", "B2B-услуги", "Медицина и клиники", "Образование", "Автосервис и автотовары", "Доставка еды", "Недвижимость"];

const OPTIONS = [
  { id: "buy", t: "Предзаказ отчёта", p: "15 000 ₽", d: "Полный отчёт по всем нишам + таблица Excel. Оплата после выхода." },
  { id: "niche", t: "Отчёт по вашей нише", p: "от 25 000 ₽", d: "Подробный срез по одной нише и региону с разбором ваших показателей." },
  { id: "share", t: "Поделиться данными", p: "бесплатно", d: "Дайте обезличенную статистику своих кампаний — получите полный отчёт бесплатно." },
];

export default function BenchmarkPage() {
  const [pick, setPick] = useState("buy");
  const cur = OPTIONS.find((o) => o.id === pick) ?? OPTIONS[0];
  const choose = (id: string) => { setPick(id); document.getElementById("order")?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <MShell active="/masshtab/otchety">
      <section className="bg-[#14110f] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-12 md:pb-16">
          <Crumbs dark items={[{ label: "Аналитические отчёты", to: "/masshtab/otchety" }, { label: "Бенчмарки Директа и e-commerce" }]} />
          <Kicker className="text-[#ff7a66] mt-8">Готовится к выпуску · предзаказ</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-3 leading-[1.05] max-w-4xl`}>Бенчмарки Яндекс Директа и e-commerce</h1>
          <p className="text-lg text-white/75 mt-4 max-w-2xl">Сколько стоит клик, заявка и покупатель в вашей нише — и нормально ли то, что вы платите сейчас. Сводим обезличенную статистику рекламных кампаний компаний-участников с открытыми данными.</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button onClick={() => choose("buy")} className="bg-[#d6402b] hover:bg-[#b93522] text-white font-bold px-5 py-3 rounded transition-colors">Оформить предзаказ</button>
            <button onClick={() => choose("share")} className="border-2 border-white/70 hover:bg-white hover:text-[#14110f] font-bold px-5 py-2.5 rounded transition-colors">Получить бесплатно за данные</button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Что будет в отчёте</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {METRICS.map(([icon, t, d]) => (
              <div key={t} className="bg-white border border-[#e2d9cb] rounded-lg p-5">
                <Icon name={icon} size={24} className="text-[#d6402b]" />
                <div className="font-bold mt-3">{t}</div>
                <p className="text-sm text-[#5b5550] mt-1">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Ниши первого выпуска</h2>
          <div className="flex flex-wrap gap-2 mt-5">
            {NICHES.map((n) => <span key={n} className="bg-[#efe7da] rounded-full px-4 py-1.5 text-sm font-semibold">{n}</span>)}
          </div>
          <p className="text-sm text-[#8a8278] mt-3">Нишу публикуем, только если по ней собрано достаточно данных для надёжной медианы. Вашей ниши нет в списке — напишите в заявке.</p>
        </section>

        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Варианты</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {OPTIONS.map((o) => (
              <div key={o.id} className="bg-white border border-[#e2d9cb] rounded-lg p-6 flex flex-col">
                <div className="font-bold text-lg">{o.t}</div>
                <div className="font-extrabold text-2xl text-[#d6402b] mt-2">{o.p}</div>
                <p className="text-sm text-[#5b5550] mt-2 flex-1">{o.d}</p>
                <button onClick={() => choose(o.id)} className="mt-5 bg-[#14110f] hover:bg-[#d6402b] text-white font-bold py-2.5 rounded transition-colors">Выбрать</button>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-[#efe7da] rounded-lg p-5 flex gap-4 text-sm">
            <Icon name="ShieldCheck" size={22} className="text-[#d6402b] shrink-0" />
            <div><b>Конфиденциальность участников.</b> Данные компаний не раскрываются: в отчёт попадают только медианы и квартили по группам не меньше чем из пяти компаний. Названия участников не публикуются.</div>
          </div>
        </section>

        <section id="order" className="mt-14 grid md:grid-cols-2 gap-10 items-start bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-10 scroll-mt-24">
          <div>
            <Kicker>Заявка</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>{cur.t}</h2>
            <p className="text-[#5b5550] mt-3">{cur.id === "share" ? "Напишите нишу и регион — пришлём простую форму выгрузки статистики. Доступ к рекламному кабинету не нужен." : "Сообщим о выходе отчёта и пришлём его первым. Укажите нишу — её посчитаем в приоритете."}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {OPTIONS.map((o) => (
                <button key={o.id} onClick={() => setPick(o.id)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${pick === o.id ? "bg-[#14110f] text-white border-[#14110f]" : "border-[#d9cfc0] hover:border-[#14110f]"}`}>{o.t}</button>
              ))}
            </div>
            <Link to="/masshtab/kalkulyator" className="inline-block text-sm font-bold text-[#d6402b] mt-6 hover:underline">Пока ждёте — посчитайте свои CAC и LTV →</Link>
          </div>
          <LeadForm key={cur.id} kind="report" cta={cur.id === "share" ? "Участвовать" : "Отправить заявку"} prefix={`Бенчмарки Директа: ${cur.t} (${cur.p})`} placeholder="Ниша, регион, месячный бюджет на рекламу" />
        </section>
      </div>
    </MShell>
  );
}
