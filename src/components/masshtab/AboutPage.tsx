import { Link } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import { DATA_SOURCES, PRINCIPLES, RUBRICS } from "./rubrics";

export default function AboutPage() {
  return (
    <MShell active="/masshtab/o-zhurnale">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        <Crumbs items={[{ label: "О журнале" }]} />
        <Kicker className="mt-6">О журнале</Kicker>
        <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-2 leading-[1.05]`}>Деловой листок без пафоса и по делу</h1>
        <p className="text-xl text-[#5b5550] mt-4 leading-relaxed">
          «Масштаб» пишет для предпринимателей и руководителей, которым нужно быстро понять, что происходит на рынке и что из этого следует для их бизнеса.
          Пять рубрик аналитики, три практических, шесть рубрик о стиле жизни предпринимателя, цитата дня, рейтинг компаний по данным ФНС и ежедневная лента экономических новостей ТАСС.
        </p>

        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Рубрики</h2>
          <div className="mt-6 divide-y divide-[#e2d9cb] border-y border-[#e2d9cb]">
            {RUBRICS.map((r) => (
              <Link key={r.slug} to="/masshtab/rubrika/$rubric" params={{ rubric: r.slug }} className="grid md:grid-cols-[220px_1fr_140px] gap-2 md:gap-6 py-4 group">
                <div className={`${serif} font-bold text-lg group-hover:text-[#d6402b]`}>{r.name}</div>
                <div><p className="text-[#3b3631]">{r.desc}</p><p className="text-xs text-[#8a8278] mt-1">{r.format}</p></div>
                <div className="text-sm text-[#8a8278] md:text-right">{r.rhythm}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Редакционные принципы</h2>
          <div className="grid md:grid-cols-2 gap-5 mt-6">
            {PRINCIPLES.map(([t, d]) => (
              <div key={t} className="bg-white border border-[#e2d9cb] rounded-lg p-5">
                <div className="font-bold">{t}</div>
                <p className="text-sm text-[#5b5550] mt-1.5">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className={`${serif} font-bold text-3xl`}>Источники данных</h2>
          <table className="w-full mt-6 text-sm">
            <tbody>
              {DATA_SOURCES.map(([s, d]) => (
                <tr key={s} className="border-b border-[#e2d9cb]"><td className="py-3 pr-6 font-bold align-top w-1/3">{s}</td><td className="py-3 text-[#5b5550]">{d}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-12 bg-[#14110f] text-white rounded-lg p-6 md:p-8">
          <h2 className={`${serif} font-bold text-2xl`}>Как устроен материал</h2>
          <ol className="mt-4 space-y-2 text-white/80 list-decimal pl-5">
            <li>Дата актуальности данных — в начале.</li>
            <li>Короткий ответ: что произошло и почему это важно.</li>
            <li>Цифры и графики с подписанным источником.</li>
            <li>Блок «Главное» — 3–5 выводов.</li>
            <li>В конце — вопрос для обсуждения или мини-задание: посчитать показатель для своего бизнеса.</li>
          </ol>
        </section>
      </div>
    </MShell>
  );
}
