import { Link } from "@tanstack/react-router";
import type { Crumb } from "./seo";

export default function Crumbs({ items, dark = false }: { items: Crumb[]; dark?: boolean }) {
  const all: Crumb[] = [{ label: "Главная", to: "/" }, { label: "Журнал «Масштаб»", to: "/masshtab" }, ...items];
  const muted = dark ? "text-white/50 hover:text-white" : "text-[#8a8278] hover:text-[#14110f]";
  return (
    <nav aria-label="Хлебные крошки" className="text-xs">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className={dark ? "text-white/30" : "text-[#cfc3b2]"}>/</span>}
              {last || !c.to ? (
                <span aria-current="page" className={`truncate max-w-[60vw] md:max-w-md ${dark ? "text-white/80" : "text-[#14110f]"}`}>{c.label}</span>
              ) : (
                <Link to={c.to} className={`${muted} transition-colors whitespace-nowrap`}>{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
