import { Link } from "@tanstack/react-router";
import { Kicker, serif } from "./MShell";
import { fmtDate, type Post } from "./api";

export default function PostCard({ p, big = false }: { p: Post; big?: boolean }) {
  return (
    <Link to="/masshtab/$slug" params={{ slug: p.slug }} className="group block">
      {p.cover_url && <img src={p.cover_url} alt={p.title} className={`w-full object-cover rounded mb-3 ${big ? "aspect-[16/9]" : "aspect-[3/2]"}`} />}
      <Kicker>{p.rubric}{p.kind === "partner" ? " · партнёрский материал" : ""}</Kicker>
      <h3 className={`${serif} font-bold leading-snug mt-1.5 group-hover:text-[#d6402b] transition-colors ${big ? "text-3xl md:text-5xl leading-[1.08]" : "text-xl"}`}>{p.title}</h3>
      {p.lead && <p className={`text-[#5b5550] mt-2 ${big ? "text-lg" : "text-sm line-clamp-3"}`}>{p.lead}</p>}
      <div className="text-xs text-[#8a8278] mt-2">
        {p.hero_name ? <><b className="text-[#14110f]">{p.hero_name}</b>{p.hero_role ? `, ${p.hero_role}` : ""} · </> : null}
        {fmtDate(p.published_at)} · {p.read_min} мин{p.data_date ? ` · данные на ${new Date(p.data_date).toLocaleDateString("ru-RU")}` : ""}
      </div>
    </Link>
  );
}
