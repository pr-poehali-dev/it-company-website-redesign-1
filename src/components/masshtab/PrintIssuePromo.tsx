import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { Kicker, serif } from "./MShell";
import { ISSUES, issueCover, issuePdf } from "./issues";

export default function PrintIssuePromo() {
  const issue = ISSUES[0];
  if (!issue) return null;
  const toc = issue.toc.slice(0, 4);

  return (
    <section className="mt-16 bg-[#efe7da] rounded-lg overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,320px)_1fr] gap-8 md:gap-12 items-center p-6 md:p-10">
        <Link to="/masshtab/pechatnyy-nomer" className="group block mx-auto w-full max-w-[260px] md:max-w-none">
          <img
            src={issueCover(issue)}
            alt={`Обложка: ${issue.title}`}
            loading="lazy"
            className="w-full aspect-[210/280] object-cover bg-white shadow-[0_24px_50px_-18px_rgba(20,17,15,0.55)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg]"
          />
        </Link>
        <div className="min-w-0">
          <Kicker>Печатная версия · {issue.pages} полос</Kicker>
          <h2 className={`${serif} font-bold text-3xl md:text-4xl mt-2 leading-tight`}>{issue.title}</h2>
          <p className="text-[#5b5550] mt-3 text-lg">
            Все главные материалы месяца в формате журнала 210×280 мм: листайте онлайн как бумажный номер или скачайте PDF.
          </p>
          <div className="mt-5 border-t border-[#d4c8b6]">
            {toc.map((t) => (
              <div key={t.page} className="grid grid-cols-[36px_1fr] gap-3 py-2 border-b border-[#d4c8b6]">
                <span className={`${serif} font-bold text-lg text-[#d6402b] leading-6`}>{t.page}</span>
                <span className={`${serif} font-bold leading-snug`}>{t.title}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/masshtab/pechatnyy-nomer"
              className="inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold rounded px-5 py-3 hover:bg-[#b93522] transition-colors"
            >
              <Icon name="BookOpen" size={18} />
              Читать печатную версию
            </Link>
            <a
              href={issuePdf(issue)}
              download
              className="inline-flex items-center gap-2 border-2 border-[#14110f] font-bold rounded px-4 py-2.5 hover:bg-[#14110f] hover:text-[#f6f2ea] transition-colors"
            >
              <Icon name="Download" size={18} />
              PDF · {String(issue.readMb).replace(".", ",")} МБ
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
