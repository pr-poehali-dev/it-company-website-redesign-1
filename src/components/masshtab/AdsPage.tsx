import { getRouteApi, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import LeadForm from "./LeadForm";
import Crumbs from "./Crumbs";
import { growthLabel, mln } from "./api";
import IssueDeadline from "./IssueDeadline";

const route = getRouteApi("/masshtab/reklama");

const FORMATS = [
  { t: "Баннер на главной", d: "Широкий блок под шапкой листка — первое, что видит читатель.", p: "от 15 000 ₽ / месяц" },
  { t: "Боковой блок", d: "Карточка с картинкой рядом с рейтингом и в каждом интервью.", p: "от 9 000 ₽ / месяц" },
  { t: "Блок внутри интервью", d: "Карточка посередине текста — самое внимательное место чтения.", p: "от 12 000 ₽ / месяц" },
  { t: "Партнёрский материал", d: "Статья или интервью о вашей компании с пометкой «партнёрский материал».", p: "от 35 000 ₽" },
  { t: "Спонсор рейтинга", d: "Логотип и упоминание в «Масштаб-500», региональные выпуски рейтинга.", p: "по запросу" },
  { t: "Спецпроект", d: "Исследование рынка на данных ФНС с вашим брендом: отчёт, статья, рассылка.", p: "по запросу" },
];

export default function AdsPage() {
  const { rating } = route.useLoaderData();
  const company = route.useSearch().company;
  const st = rating?.stats;
  return (
    <MShell active="/masshtab/reklama">
      <section className="bg-[#14110f] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-12 md:pb-16">
          <Crumbs dark items={[{ label: "Реклама и сотрудничество" }]} />
          <Kicker className="text-[#ff7a66] mt-8">Реклама и сотрудничество</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-3 leading-[1.05] max-w-3xl`}>Ваш бренд рядом с историями быстрорастущих компаний</h1>
          <p className="text-lg text-white/75 mt-4 max-w-2xl">«Масштаб» читают собственники, финансовые директора, стратеги и руководители цифровых направлений — люди, у которых в бюджете есть статьи на аналитику, ПО, консалтинг и финансирование.</p>
          {st && (
            <div className="flex flex-wrap gap-10 mt-8">
              <div><div className={`${serif} font-bold text-3xl`}>{st.companies}</div><div className="text-xs text-white/60">компаний в рейтинге</div></div>
              <div><div className={`${serif} font-bold text-3xl`}>{mln(st.revenue)}</div><div className="text-xs text-white/60">их общая выручка</div></div>
              <div><div className={`${serif} font-bold text-3xl`}>{growthLabel(st.median)}</div><div className="text-xs text-white/60">медианный рост за 3 года</div></div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Форматы размещения</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {FORMATS.map((f) => (
              <div key={f.t} className="bg-white border border-[#e2d9cb] rounded-lg p-5 flex flex-col">
                <div className="font-bold text-lg">{f.t}</div>
                <p className="text-sm text-[#5b5550] mt-2 flex-1">{f.d}</p>
                <div className="text-sm font-extrabold text-[#d6402b] mt-4">{f.p}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#8a8278] mt-3">Все рекламные материалы помечаются как реклама. Стоимость — ориентир на период запуска листка.</p>
          <div className="mt-6 max-w-3xl"><IssueDeadline /></div>
          <Link to="/masshtab/mediakit" className="mt-5 inline-flex items-center gap-2 border-2 border-[#14110f] text-[#14110f] font-bold text-sm px-4 py-2.5 rounded hover:bg-[#14110f] hover:text-white transition-colors">
            <Icon name="FileText" size={16} />Открыть медиакит (PDF)
          </Link>
        </section>

        <section className="mt-14 grid md:grid-cols-2 gap-10 items-start">
          <div>
            <Kicker>Рекламодателям</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>Обсудить размещение</h2>
            <p className="text-[#5b5550] mt-3">Расскажите о задаче — предложим формат и пришлём медиакит со статистикой аудитории.</p>
          </div>
          <LeadForm kind="ad" cta="Получить медиакит" placeholder="Что хотите продвигать и какой формат интересен" />
        </section>

        <section id="hero" className="mt-14 grid md:grid-cols-2 gap-10 items-start bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-10 scroll-mt-24">
          <div>
            <Kicker>Героям интервью</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>Расскажите историю своей компании</h2>
            <p className="text-[#5b5550] mt-3">Ищем основателей и руководителей, которым есть что рассказать: быстрый рост, смелый поворот, выход на новый рынок. Компаниям из «Масштаб-500» интервью публикуем бесплатно.</p>
            {company && <div className="mt-4 bg-[#efe7da] rounded p-3 text-sm">Компания: <b>{company}</b> — укажите её в заявке.</div>}
          </div>
          <LeadForm kind="hero" cta="Предложить интервью" placeholder="Коротко о компании, ваша роль и о чём хотите рассказать" />
        </section>
      </div>
    </MShell>
  );
}
