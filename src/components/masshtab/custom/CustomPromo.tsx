import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "../MShell";
import Crumbs from "../Crumbs";

const MODULES: [string, string, string][] = [
  ["GraduationCap", "Обучение от учисьпро.рф", "Полные обучающие материалы нашей образовательной платформы по 9 тематикам: нейросети, профессии и карьера, управление и деньги, школа и ЕГЭ, советы родителям, наука."],
  ["Newspaper", "Статьи онлайн-журнала", "Разборы, индикаторы, финансы для нефинансистов, обучение руководителей — любые материалы сайта, с графиками и таблицами."],
  ["BookOpen", "Полосы вышедших номеров", "Статьи из архива печатных номеров в оригинальной вёрстке журнала."],
  ["Trophy", "Рейтинг «Масштаб-500»", "Самые быстрорастущие компании по вашему региону и отрасли: вы видите своих конкурентов и партнёров."],
  ["PieChart", "Портрет рынка", "Сколько компаний в вашем регионе и отрасли, их выручка, маржа и доля убыточных — чтобы сравнить себя с типичной компанией."],
  ["LineChart", "Индикаторы рынка", "Ключевая ставка, курсы валют и главные новости экономики на день сборки."],
  ["Quote", "Мысли для руководителя", "Подборка цитат об управлении, деньгах и людях с источниками."],
  ["NotebookPen", "Рабочие страницы", "План на месяц, таблица «план — факт» по ключевым цифрам и страница для заметок."],
  ["UserRound", "Персональная обложка", "Своё название выпуска, имя и компания — для себя, для совета директоров или в подарок партнёру."],
];

const FAQ: [string, string][] = [
  ["Сколько стоит?", "990 ₽ за один выпуск — до 20 модулей. Оплата разовая, без подписки."],
  ["Когда я получу PDF?", "Сразу после оплаты: выпуск собирается за несколько секунд и остаётся в личном кабинете. Скачивать можно сколько угодно раз."],
  ["Можно ли изменить выпуск после оплаты?", "Оплаченный выпуск уже собран и не меняется. Хотите другой набор — соберите новый выпуск."],
  ["Можно ли распечатать?", "Да, формат 210×280 мм как у журнала. Выпуск — для личного использования, распространять его нельзя."],
  ["Как оплатить?", "Банковской картой или СБП через ЮKassa. Чек придёт на почту, указанную при входе."],
];

export default function CustomPromo() {
  return (
    <MShell active="/masshtab/svoy-zhurnal">
      <section className="bg-[#14110f] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-14">
          <Crumbs dark items={[{ label: "Свой журнал" }]} />
          <div className="grid md:grid-cols-[minmax(0,1fr)_320px] gap-10 items-center mt-8">
            <div>
              <Kicker className="!text-[#ff8a73]">Новая услуга · 990 ₽</Kicker>
              <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-3 leading-[1.05]`}>Свой «Масштаб»: журнал, собранный под вас</h1>
              <p className="text-lg text-white/75 mt-4 max-w-2xl">Выберите в личном кабинете только то, что нужно вашему бизнесу, — и получите аккуратный PDF-выпуск с обложкой, содержанием и нумерацией.</p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Link to="/masshtab/kabinet" className="inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold px-6 py-3.5 rounded hover:bg-[#b93522]"><Icon name="Sparkles" size={18} />Собрать свой журнал</Link>
                <Link to="/masshtab/arhiv" className="inline-flex items-center gap-2 border-2 border-white/40 font-bold px-5 py-3 rounded hover:bg-white hover:text-[#14110f]">Смотреть архив номеров</Link>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="aspect-[210/280] bg-[#f6f2ea] text-[#14110f] p-6 shadow-[0_30px_80px_-20px_rgba(214,64,43,0.55)] rotate-2">
                <div className="flex justify-between text-[8px] font-bold tracking-[0.14em] uppercase border-b border-[#14110f] pb-1"><span>Персональный выпуск</span><span>2026</span></div>
                <div className={`${serif} font-bold text-5xl mt-3`}>Масштаб<span className="text-[#d6402b]">.</span></div>
                <div className="h-1 bg-[#d6402b] mt-5" />
                <div className="text-[8px] font-bold tracking-[0.14em] uppercase text-[#d6402b] mt-3">Собрано лично для вас</div>
                <div className={`${serif} font-bold text-2xl leading-tight mt-1`}>Мой «Масштаб»: стройка и финансы</div>
                <div className="font-bold text-sm mt-1">Анна Смирнова, ООО «Вектор»</div>
                <div className="mt-4 space-y-2 text-xs">
                  {["Нейросети для работы: классификация 2026", "Портрет рынка: Самарская обл. · Строительство", "«Масштаб-500»: Строительство — топ-50"].map((t) => <div key={t} className="border-t border-[#e2d9cb] pt-1.5 font-semibold">{t}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Из чего собирается выпуск</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {MODULES.map(([ic, t, d]) => (
              <div key={t} className="bg-white border border-[#e2d9cb] rounded-lg p-5">
                <span className="w-10 h-10 rounded-full bg-[#d6402b] text-white flex items-center justify-center"><Icon name={ic} size={20} /></span>
                <div className="font-bold text-lg mt-3">{t}</div>
                <p className="text-sm text-[#5b5550] mt-1.5">{d}</p>
              </div>
            ))}
            <Link to="/masshtab/kabinet" className="bg-[#d6402b] text-white rounded-lg p-5 flex flex-col justify-between gap-6 hover:bg-[#b93522] sm:col-span-2 lg:col-span-3">
              <div className={`${serif} font-bold text-4xl`}>990 ₽</div>
              <div><div className="font-bold text-lg">за выпуск до 20 модулей</div><div className="text-sm text-white/80 mt-1">Разовая оплата, PDF сразу в кабинете →</div></div>
            </Link>
          </div>
        </section>

        <section className="mt-14 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className={`${serif} font-bold text-3xl`}>Кому пригодится</h2>
            <ul className="mt-5 space-y-3 text-[#3b3631]">
              {["Собственнику — подборка по своей отрасли и региону, которую удобно прочитать в дороге или распечатать.",
                "Финансовому директору — нормы маржи, индикаторы и налоговые изменения в одном файле к совещанию.",
                "Отделу продаж — рейтинг быстрорастущих компаний своего региона как список перспективных клиентов.",
                "Команде и семье — обучающие материалы учисьпро.рф о нейросетях, профессиях, школе и ЕГЭ.",
                "В подарок партнёру или клиенту — выпуск с его именем и компанией на обложке."].map((t) => (
                <li key={t} className="flex gap-3"><Icon name="Check" size={18} className="text-[#d6402b] shrink-0 mt-0.5" />{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={`${serif} font-bold text-3xl`}>Вопросы и ответы</h2>
            <div className="mt-5 border-t-2 border-[#14110f]">
              {FAQ.map(([q, a]) => (
                <details key={q} className="border-b border-[#e2d9cb] py-3 group">
                  <summary className="font-bold cursor-pointer list-none flex justify-between gap-3">{q}<Icon name="Plus" size={18} className="shrink-0 group-open:rotate-45 transition-transform" /></summary>
                  <p className="text-sm text-[#5b5550] mt-2">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-14 bg-white border-2 border-[#14110f] rounded-lg p-6 md:p-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className={`${serif} font-bold text-2xl`}>Соберите первый выпуск за пару минут</div>
            <p className="text-[#5b5550] mt-1">Вход по почте без пароля. Черновик можно сохранить и вернуться позже.</p>
          </div>
          <Link to="/masshtab/kabinet" className="inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold px-6 py-3.5 rounded hover:bg-[#b93522]"><Icon name="Sparkles" size={18} />Открыть конструктор</Link>
        </div>
      </div>
    </MShell>
  );
}
