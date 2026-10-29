import { dayLabel, timeAgo, type NewsItem } from "./api";
import { Kicker } from "./MShell";

export default function NewsFeed({ items, limit = 10, title = "Лента" }: { items: NewsItem[]; limit?: number; title?: string }) {
  if (!items.length) return null;
  let lastDay = "";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Kicker>{title}</Kicker>
        <a href="https://tass.ru/ekonomika" target="_blank" rel="noopener" className="text-[11px] text-[#8a8278] hover:text-[#14110f]">по данным ТАСС</a>
      </div>
      <div className="mt-3 border-l-2 border-[#d6402b] pl-4 space-y-3">
        {items.slice(0, limit).map((n) => {
          const day = dayLabel(n.date);
          const showDay = day !== lastDay && lastDay !== "";
          lastDay = day;
          return (
            <div key={n.link}>
              {showDay && <div className="text-[10px] uppercase tracking-wider text-[#8a8278] mb-2 -ml-4 pl-4 border-t border-[#e2d9cb] pt-2">{day}</div>}
              <a href={n.link} target="_blank" rel="noopener" className="block group">
                <span className="text-[11px] text-[#8a8278]">{timeAgo(n.date)}{n.tag ? ` · ${n.tag}` : ""}</span>
                <span className="block text-sm font-semibold leading-snug group-hover:text-[#d6402b]">{n.title}</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
