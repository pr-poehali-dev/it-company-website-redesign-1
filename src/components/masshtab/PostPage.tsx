import { useEffect, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import MShell, { Kicker, serif } from "./MShell";
import AdSlot, { pickAd } from "./AdSlot";
import Markdown from "./Markdown";
import Crumbs from "./Crumbs";
import DownloadArticle from "./DownloadArticle";
import DzenSubscribe from "./DzenSubscribe";
import { rubricByName } from "./rubrics";
import { LEARN_PATH, LEARN_RUBRIC } from "./learn";
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
  const h2 = paras.map((p, i) => (p.startsWith("## ") ? i : -1)).filter((i) => i > 0);
  const half = h2.length ? h2[Math.floor(h2.length / 2)] : Math.ceil(paras.length / 2);
  const takeaways = (post.takeaways || "").split("\n").map((x) => x.replace(/^[-—•\d.)\s]+/, "").trim()).filter(Boolean);
  const sources = (post.sources || "").split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <MShell>
      <article className="max-w-6xl mx-auto px-4 md:px-6 pt-8">
        <Crumbs items={[...(post.rubric === LEARN_RUBRIC ? [{ label: "Обучение", to: LEARN_PATH }] : rubricByName(post.rubric) ? [{ label: post.rubric, to: `/masshtab/rubrika/${rubricByName(post.rubric)!.slug}` }] : []), { label: post.title }]} />
        <div className="max-w-3xl mt-5">
          <Kicker>{post.rubric}{post.kind === "partner" ? " · партнёрский материал" : ""}</Kicker>
          <h1 className={`${serif} font-bold text-4xl md:text-6xl leading-[1.05] mt-3`}>{post.title}</h1>
          {post.lead && <p className={`${serif} text-xl md:text-2xl text-[#5b5550] mt-4 leading-snug`}>{post.lead}</p>}
          <div className="text-sm text-[#8a8278] mt-4">{post.author} · {fmtDate(post.published_at)} · {post.read_min} мин чтения</div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {post.data_date && (
              <div className="inline-block text-xs font-semibold bg-[#efe7da] rounded px-3 py-1.5">Данные актуальны на {new Date(post.data_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</div>
            )}
            <DownloadArticle post={post} />
          </div>
        </div>
        {post.cover_url && !post.content.includes(post.cover_url) && (
          <figure className="mt-8">
            <img src={post.cover_url} alt={post.hero_name || post.title} className="w-full max-h-[560px] object-cover rounded" />
            {post.hero_name && <figcaption className="text-sm text-[#8a8278] mt-2"><b className="text-[#14110f]">{post.hero_name}</b>{post.hero_role ? `, ${post.hero_role}` : ""}</figcaption>}
          </figure>
        )}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-12 mt-10">
          <div className="min-w-0 break-words text-[17px] md:text-lg leading-[1.75] text-[#2b2724] font-['Georgia',serif] max-w-[680px]">
            {takeaways.length > 0 && (
              <div className="mb-10 border-y-2 border-[#14110f] py-5 font-['Golos_Text',sans-serif]">
                <Kicker>Главное</Kicker>
                <ol className="mt-3 space-y-2 text-base">
                  {takeaways.map((t, i) => <li key={i} className="flex gap-3"><b className={`${serif} text-[#d6402b] text-lg leading-6`}>{i + 1}</b><span>{t}</span></li>)}
                </ol>
              </div>
            )}
            <Markdown text={paras.slice(0, half).join("\n\n")} />
            <div className="my-10 font-['Golos_Text',sans-serif]"><AdSlot ad={pickAd(ads, "inline")} variant="wide" house={2} /></div>
            <Markdown text={paras.slice(half).join("\n\n")} />
            {post.question && (
              <div className="mt-10 bg-[#efe7da] rounded-lg p-6 font-['Golos_Text',sans-serif]">
                <Kicker>Посчитайте для себя</Kicker>
                <div className="mt-2 text-base leading-relaxed whitespace-pre-line">{post.question}</div>
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-3 font-['Golos_Text',sans-serif] text-sm text-[#5b5550]">
              <DownloadArticle post={post} />
              <span>Word, HTML, Markdown или текст — для публикации на других площадках</span>
            </div>
            <DzenSubscribe />
            {sources.length > 0 && (
              <div className="mt-8 pt-4 border-t border-[#e2d9cb] font-['Golos_Text',sans-serif] text-sm text-[#5b5550]">
                <div className="font-bold text-[#14110f] mb-1">Источники</div>
                <ul className="space-y-1">
                  {sources.map((s, i) => {
                    const m = s.match(/^(.*?)\s*(https?:\/\/\S+)$/);
                    return <li key={i}>{m ? <a href={m[2]} target="_blank" rel="noopener" className="underline hover:text-[#d6402b]">{m[1] || m[2]}</a> : s}</li>;
                  })}
                </ul>
              </div>
            )}
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
            <DzenSubscribe variant="side" />
            <AdSlot ad={pickAd(ads, "side")} house={3} />
          </aside>
        </div>
        {post.more.length > 0 && (
          <section className="mt-16 pt-8 border-t-2 border-[#14110f]">
            <h2 className={`${serif} font-bold text-2xl mb-6`}>Читайте также</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {post.more.map((p) => (
                <Link key={p.id} to="/masshtab/$slug" params={{ slug: p.slug }} className="group">
                  {p.cover_url && <img src={p.cover_url} alt={p.title} className="w-full aspect-[3/2] object-cover rounded mb-3" />}
                  <Kicker>{p.rubric}</Kicker>
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
