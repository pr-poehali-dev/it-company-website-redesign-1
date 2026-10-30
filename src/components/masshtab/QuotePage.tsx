import { getRouteApi } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import QuoteCard from "./QuoteCard";
import { dayLabel } from "./api";

const route = getRouteApi("/masshtab/citata-dnya");

export default function QuotePage() {
  const { quote, archive } = route.useLoaderData();
  return (
    <MShell active="citata-dnya">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        <Crumbs items={[{ label: "Цитата дня" }]} />
        <Kicker className="mt-6">Каждый день</Kicker>
        <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-2`}>Цитата дня</h1>
        <p className="text-lg text-[#5b5550] mt-3 max-w-2xl">
          Мысли предпринимателей, инвесторов и экономистов — с источником и коротким комментарием редакции о том, как применить их в своём бизнесе.
        </p>
        <div className="mt-10">
          {quote ? <QuoteCard q={quote} big link={false} /> : (
            <div className="bg-white border border-[#e2d9cb] rounded-lg p-8 text-[#5b5550]">Цитата дня скоро появится.</div>
          )}
        </div>
        {archive.length > 0 && (
          <section className="mt-14">
            <h2 className={`${serif} font-bold text-3xl`}>Предыдущие дни</h2>
            <div className="mt-5 border-t-2 border-[#14110f] divide-y divide-[#e2d9cb]">
              {archive.map((q) => (
                <figure key={`${q.day}-${q.id}`} className="grid md:grid-cols-[130px_1fr] gap-2 md:gap-6 py-5">
                  <div className="text-sm font-semibold text-[#8a8278]">{q.day ? dayLabel(q.day) : ""}</div>
                  <div>
                    <blockquote className={`${serif} italic text-xl leading-snug`}>«{q.text}»</blockquote>
                    <figcaption className="text-sm text-[#5b5550] mt-2"><b className="text-[#14110f]">{q.author}</b>{q.source ? ` · ${q.source}` : ""}</figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    </MShell>
  );
}
