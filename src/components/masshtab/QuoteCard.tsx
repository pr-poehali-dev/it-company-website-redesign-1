import { Link } from "@tanstack/react-router";
import { Kicker, serif } from "./MShell";
import { dayLabel, type Quote } from "./api";

export default function QuoteCard({ q, big = false, link = true }: { q: Quote; big?: boolean; link?: boolean }) {
  return (
    <figure className={`relative bg-[#14110f] text-[#f6f2ea] rounded-lg overflow-hidden ${big ? "p-8 md:p-14" : "p-6 md:p-8"}`}>
      <span aria-hidden className={`${serif} absolute -top-4 right-4 md:right-8 text-[#d6402b]/40 leading-none select-none pointer-events-none ${big ? "text-[200px]" : "text-[130px]"}`}>“</span>
      <div className="relative">
        <Kicker className="!text-[#e8836f]">Цитата дня{q.day ? ` · ${dayLabel(q.day)}` : ""}</Kicker>
        <blockquote className={`${serif} italic font-semibold leading-snug mt-4 ${big ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"}`}>«{q.text}»</blockquote>
        <figcaption className="mt-5">
          <div className="font-bold text-lg">{q.author}</div>
          {(q.author_role || q.source) && (
            <div className="text-sm text-white/60 mt-0.5">{[q.author_role, q.source].filter(Boolean).join(" · ")}</div>
          )}
        </figcaption>
        {q.comment && (
          <div className="mt-6 pt-5 border-t border-white/15 max-w-2xl">
            <div className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#e8836f]">Что это значит для бизнеса</div>
            <p className="text-white/85 mt-2 leading-relaxed">{q.comment}</p>
          </div>
        )}
        {link && (
          <Link to="/masshtab/citata-dnya" className="inline-block mt-6 text-sm font-bold text-[#e8836f] hover:text-white">
            Архив цитат →
          </Link>
        )}
      </div>
    </figure>
  );
}
