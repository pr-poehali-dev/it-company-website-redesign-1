import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import AdSlot from "./AdSlot";
import { ISSUES, issueCover, issuePdf } from "./issues";

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

function nextIssueMonth() {
  const last = ISSUES[0];
  if (!last) return null;
  const [y, m] = last.id.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  return `${MONTHS[nm - 1]} ${m === 12 ? y + 1 : y}`;
}

export default function IssueArchive() {
  const years = Array.from(new Set(ISSUES.map((i) => i.id.slice(0, 4))));
  const next = nextIssueMonth();

  return (
    <MShell active="/masshtab/arhiv">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-16">
        <Crumbs items={[{ label: "Архив номеров" }]} />
        <div className="mt-6 max-w-3xl">
          <Kicker>Печатная версия · выходит ежемесячно</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-5xl mt-2 leading-[1.05]`}>Архив номеров</h1>
          <p className="text-lg text-[#5b5550] mt-3">
            «Масштаб» выходит раз в месяц. Здесь хранятся все номера: листайте онлайн так, как они выглядят на бумаге, или скачайте PDF.
          </p>
        </div>

        {years.map((y) => (
          <section key={y} className="mt-12">
            <h2 className={`${serif} font-bold text-3xl border-b-2 border-[#14110f] pb-2`}>{y}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mt-6">
              {ISSUES.filter((i) => i.id.startsWith(y)).map((i, idx) => (
                <article key={i.id} className="group">
                  <Link to="/masshtab/arhiv/$issue" params={{ issue: i.id }} className="block relative">
                    <img src={issueCover(i)} alt={i.title} loading="lazy" className="w-full aspect-[210/280] object-cover bg-white shadow-[0_14px_40px_-16px_rgba(20,17,15,0.6)] group-hover:-translate-y-1 transition-transform" />
                    {y === years[0] && idx === 0 && (
                      <span className="absolute top-2 left-2 bg-[#d6402b] text-white text-[10px] font-extrabold tracking-[0.14em] uppercase px-2 py-1 rounded">Свежий номер</span>
                    )}
                  </Link>
                  <div className="mt-3">
                    <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8a8278]">№ {i.number} · {i.month}</div>
                    <Link to="/masshtab/arhiv/$issue" params={{ issue: i.id }} className={`block ${serif} font-bold text-lg leading-snug mt-1 group-hover:text-[#d6402b]`}>{i.title}</Link>
                    <div className="text-xs text-[#8a8278] mt-1">{i.pages} полос · {i.toc.length} материалов</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm font-bold">
                      <Link to="/masshtab/arhiv/$issue" params={{ issue: i.id }} className="inline-flex items-center gap-1 text-[#d6402b]"><Icon name="BookOpen" size={15} />Листать</Link>
                      <a href={issuePdf(i)} download className="inline-flex items-center gap-1 text-[#14110f] hover:text-[#d6402b]"><Icon name="Download" size={15} />PDF · {String(i.readMb).replace(".", ",")} МБ</a>
                    </div>
                  </div>
                </article>
              ))}
              {y === years[0] && next && (
                <div className="flex flex-col items-center justify-center text-center aspect-[210/280] border-2 border-dashed border-[#cfc3b2] rounded p-4">
                  <Icon name="CalendarClock" size={28} className="text-[#d6402b]" />
                  <div className={`${serif} font-bold text-lg mt-3`}>Следующий номер</div>
                  <div className="text-sm text-[#5b5550] mt-1">{next}</div>
                  <Link to="/masshtab/podpiska" className="text-sm font-bold text-[#d6402b] mt-3">Оформить подписку →</Link>
                </div>
              )}
            </div>
          </section>
        ))}

        <div className="mt-16"><AdSlot variant="wide" house={0} /></div>
      </div>
    </MShell>
  );
}
