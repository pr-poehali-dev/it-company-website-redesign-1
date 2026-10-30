import { useEffect, useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import LeadForm from "./LeadForm";
import { L_URL, fmtDate, type LearnPost, type Track } from "./api";

const route = getRouteApi("/masshtab/obuchenie");

function Badge({ origin }: { origin: string }) {
  if (origin === "ai_case") return <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-[0.12em] uppercase bg-[#14110f] text-[#f6f2ea] px-2 py-0.5 rounded">Кейс</span>;
  if (origin === "uchispro") return <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-[0.12em] uppercase bg-[#efe7da] text-[#5b5550] px-2 py-0.5 rounded">учисьпро.рф</span>;
  return null;
}

function LearnCard({ p, track, big = false }: { p: LearnPost; track?: Track; big?: boolean }) {
  return (
    <Link to="/masshtab/$slug" params={{ slug: p.slug }} className="group block">
      {p.cover_url && (
        <img src={p.cover_url} alt={p.title} loading="lazy" className={`w-full rounded object-cover mb-3 ${big ? "aspect-[16/8]" : "aspect-[16/9]"}`} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge origin={p.origin} />
        {track && <Kicker>{track.name}</Kicker>}
      </div>
      <h3 className={`${serif} font-bold leading-snug mt-2 group-hover:text-[#d6402b] transition-colors ${big ? "text-3xl md:text-4xl leading-[1.1]" : "text-xl"}`}>{p.title}</h3>
      {p.lead && <p className={`text-[#5b5550] mt-2 ${big ? "text-lg" : "text-sm line-clamp-3"}`}>{p.lead}</p>}
      <div className="text-xs text-[#8a8278] mt-2">{fmtDate(p.published_at)} · {p.read_min} мин</div>
    </Link>
  );
}

export default function LearnPage() {
  const { tracks, posts } = route.useLoaderData();
  const { t } = route.useSearch();
  const byTrack = useMemo(() => Object.fromEntries(tracks.map((x) => [x.slug, x])), [tracks]);
  const active = t && byTrack[t] ? byTrack[t] : null;
  const list = active ? posts.filter((p) => p.track === active.slug) : posts;
  const [main, ...rest] = list;
  const cases = posts.filter((p) => p.origin === "ai_case").length;

  useEffect(() => {
    const k = "masshtab-learn-tick";
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 3 * 3600 * 1000) return;
    sessionStorage.setItem(k, String(Date.now()));
    const t = setTimeout(() => { fetch(`${L_URL}/?action=tick`, { keepalive: true }).catch(() => undefined); }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <MShell active="/masshtab/obuchenie">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <Crumbs items={active ? [{ label: "Обучение", to: "/masshtab/obuchenie" }, { label: active.name }] : [{ label: "Обучение" }]} />

        <section className="mt-6 grid lg:grid-cols-[1fr_340px] gap-8 items-end">
          <div>
            <Kicker>Обучение для руководителей · обновляется каждый день</Kicker>
            <h1 className={`${serif} font-bold text-4xl md:text-6xl mt-2 leading-[1.05]`}>{active ? active.name : "Школа руководителя"}</h1>
            <p className="text-lg text-[#5b5550] mt-3 max-w-2xl">
              {active
                ? active.desc
                : "Разборы управленческих ситуаций на цифрах: что пробовали, почему не сработало, какое решение помогло и как применить это у себя. Новый кейс — каждый день."}
            </p>
          </div>
          <div className="bg-[#14110f] text-[#f6f2ea] rounded-lg p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className={`${serif} font-bold text-3xl`}>{posts.length}</div><div className="text-[11px] text-white/60 mt-1">материалов</div></div>
              <div><div className={`${serif} font-bold text-3xl text-[#e8836f]`}>{cases}</div><div className="text-[11px] text-white/60 mt-1">кейсов</div></div>
              <div><div className={`${serif} font-bold text-3xl`}>{tracks.length}</div><div className="text-[11px] text-white/60 mt-1">направлений</div></div>
            </div>
            <a href="https://учисьпро.рф" target="_blank" rel="noopener" className="mt-4 flex items-center justify-center gap-2 text-sm font-bold bg-[#d6402b] hover:bg-[#b93522] rounded py-2.5 transition-colors">
              <Icon name="GraduationCap" size={16} />Курсы для руководителей на учисьпро.рф
            </a>
          </div>
        </section>

        <nav className="mt-8 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          <Link to="/masshtab/obuchenie" search={{}} className={`shrink-0 text-sm font-semibold rounded-full px-4 py-2 border ${!active ? "bg-[#14110f] text-[#f6f2ea] border-[#14110f]" : "border-[#d4c8b6] hover:border-[#14110f]"}`}>
            Все направления
          </Link>
          {tracks.map((x) => (
            <Link key={x.slug} to="/masshtab/obuchenie" search={{ t: x.slug }}
              className={`shrink-0 text-sm font-semibold rounded-full px-4 py-2 border ${active?.slug === x.slug ? "bg-[#14110f] text-[#f6f2ea] border-[#14110f]" : "border-[#d4c8b6] hover:border-[#14110f]"}`}>
              {x.name}<span className="opacity-50 ml-1.5">{x.count}</span>
            </Link>
          ))}
        </nav>

        <div className="grid lg:grid-cols-[1fr_300px] gap-10 mt-8 pt-8 border-t-2 border-[#14110f]">
          <div className="min-w-0">
            {main ? (
              <>
                <LearnCard p={main} track={main.track ? byTrack[main.track] : undefined} big />
                {rest.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-8 mt-10 pt-8 border-t border-[#e2d9cb]">
                    {rest.map((p) => <LearnCard key={p.id} p={p} track={p.track ? byTrack[p.track] : undefined} />)}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-[#e2d9cb] rounded-lg p-8">
                <div className={`${serif} font-bold text-2xl`}>Первые кейсы направления готовятся</div>
                <p className="text-[#5b5550] mt-2">Новый материал появляется каждый день. Пока загляните в другие направления.</p>
              </div>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            {!active && (
              <div className="bg-white border border-[#e2d9cb] rounded-lg p-5">
                <Kicker>Направления</Kicker>
                <div className="mt-3 divide-y divide-[#efe8dc]">
                  {tracks.map((x) => (
                    <Link key={x.slug} to="/masshtab/obuchenie" search={{ t: x.slug }} className="block py-3 group">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold group-hover:text-[#d6402b]">{x.name}</span>
                        <span className="text-xs text-[#8a8278]">{x.count}</span>
                      </div>
                      <p className="text-xs text-[#5b5550] mt-0.5 leading-snug">{x.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-[#efe7da] rounded-lg p-5 text-sm leading-relaxed">
              <Kicker>Как устроены кейсы</Kicker>
              <p className="mt-2 text-[#3b3631]">Ситуация с цифрами → что не сработало → решение по шагам → результат → чек-лист «Как применить у себя».</p>
              <p className="mt-2 text-[#8a8278] text-xs">Учебные кейсы составлены редакцией на основе типичных ситуаций малого и среднего бизнеса; компании и герои вымышлены. Материалы с пометкой «учисьпро.рф» — от методического отдела УЧИСЬПРО.</p>
            </div>
            <div className="bg-white border border-[#e2d9cb] rounded-lg p-5">
              <Kicker>Предложите ситуацию</Kicker>
              <p className="text-sm text-[#5b5550] mt-2 mb-4">Опишите управленческую задачу — редакция разберёт её в одном из следующих кейсов.</p>
              <LeadForm kind="hero" cta="Предложить кейс" placeholder="Какая ситуация в команде, продажах или финансах" />
            </div>
          </aside>
        </div>
      </div>
    </MShell>
  );
}
