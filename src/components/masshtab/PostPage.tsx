import { useEffect, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import AdSlot, { pickAd } from "./AdSlot";
import Markdown from "./Markdown";
import { companyName, fmtDate, growthLabel, mGet, mln, type Ad } from "./api";

const route = getRouteApi("/masshtab/$slug");

export default function PostPage() {
  const { post } = route.useLoaderData();
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => { mGet<{ ads: Ad[] }>({ action: "ads" }).then((r) => setAds(r.data?.ads ?? [])); }, []);
  const c = post.company;
  const years = c ? ([["2022", c.rev2022], ["2023", c.rev2023], ["2024", c.rev2024], ["2025", c.rev2025]] as const).filter(([, v]) => v) : [];
  const max = Math.max(...years.map(([, v]) => Number(v)), 1);
  const paras = post.content.split(/\n{2,}/);
  const half = Math.ceil(paras.length / 2);

  return (
    <MShell>
      <article className="max-w-6xl mx-auto px-4 md:px-6 pt-8">
        <div className="max-w-3xl">
          <Kicker>{post.kind === "interview" ? "Интервью" : post.rubric}{post.kind === "partner" ? " · партнёрский материал" : ""}</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-6xl leading-[1.05] mt-3`}>{post.title}</h1>
          {post.lead && <p className={`${serif} text-xl md:text-2xl text-[#5b5550] mt-4 leading-snug`}>{post.lead}</p>}
          <div className="text-sm text-[#8a8278] mt-4">{post.author} · {fmtDate(post.published_at)} · {post.read_min} мин чтения</div>
        </div>
        {post.cover_url && (
          <figure className="mt-8">
            <img src={post.cover_url} alt={post.hero_name || post.title} className="w-full max-h-[560px] object-cover rounded" />
            {post.hero_name && <figcaption className="text-sm text-[#8a8278] mt-2"><b className="text-[#14110f]">{post.hero_name}</b>{post.hero_role ? `, ${post.hero_role}` : ""}</figcaption>}
          </figure>
        )}
        <div className="grid lg:grid-cols-[1fr_300px] gap-12 mt-10">
          <div className="text-[17px] md:text-lg leading-[1.75] text-[#2b2724] font-['Georgia',serif] max-w-[680px]">
            <Markdown text={paras.slice(0, half).join("\n\n")} />
            <div className="my-10 font-['Golos_Text',sans-serif]"><AdSlot ad={pickAd(ads, "inline")} variant="wide" /></div>
            <Markdown text={paras.slice(half).join("\n\n")} />
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            {c && (
              <div className="bg-white border border-[#e2d9cb] rounded-lg p-5">
                <Kicker>Карточка компании</Kicker>
                <div className="font-bold text-lg mt-1.5 leading-snug">{companyName(c.name).opf} «{companyName(c.name).title}»</div>
                <div className="text-xs text-[#8a8278]">{c.region_name} · ИНН {c.inn}</div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div><div className="text-[11px] text-[#8a8278]">Выручка 2025</div><div className="font-extrabold">{mln(c.rev2025 ?? c.revenue)}</div></div>
                  {c.growth != null && <div><div className="text-[11px] text-[#8a8278]">Рост с 2022</div><div className="font-extrabold text-[#16803c]">{growthLabel(c.growth)}</div></div>}
                  {c.revenue != null && c.expenses != null && <div><div className="text-[11px] text-[#8a8278]">Доходы − расходы</div><div className="font-extrabold">{mln(c.revenue - c.expenses)}</div></div>}
                  {c.staff ? <div><div className="text-[11px] text-[#8a8278]">Сотрудники</div><div className="font-extrabold">{c.staff}</div></div> : null}
                </div>
                {years.length > 1 && (
                  <div className="flex items-end gap-2 h-20 mt-4">
                    {years.map(([y, v], i) => (
                      <div key={y} className="flex-1 text-center">
                        <i className={`block rounded-sm ${i === years.length - 1 ? "bg-[#d6402b]" : "bg-[#d4c8b6]"}`} style={{ height: `${Math.max(8, (Number(v) / max) * 64)}px` }} />
                        <span className="text-[10px] text-[#8a8278]">{y}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-[#8a8278] mt-2">Источник: ФНС, ГИР БО</div>
                <a href={`/analytics/company/${c.inn}`} className="block text-sm font-bold text-[#d6402b] mt-3">Полный отчёт о компании →</a>
              </div>
            )}
            <AdSlot ad={pickAd(ads, "side")} />
          </aside>
        </div>
        {post.more.length > 0 && (
          <section className="mt-16 pt-8 border-t-2 border-[#14110f]">
            <h2 className={`${serif} font-bold text-2xl mb-6`}>Читайте также</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {post.more.map((p) => (
                <Link key={p.id} to="/masshtab/$slug" params={{ slug: p.slug }} className="group">
                  {p.cover_url && <img src={p.cover_url} alt={p.title} className="w-full aspect-[3/2] object-cover rounded mb-3" />}
                  <Kicker>{p.kind === "interview" ? "Интервью" : p.rubric}</Kicker>
                  <h3 className={`${serif} font-bold text-lg leading-snug mt-1 group-hover:text-[#d6402b]`}>{p.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </MShell>
  );
}
