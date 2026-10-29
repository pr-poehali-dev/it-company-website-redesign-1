import { useEffect, useRef, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import AdSlot, { pickAd } from "./AdSlot";
import LeadForm from "./LeadForm";
import { companyName, growthLabel, mGet, mln, type Ad, type Filters, type RatingItem, type RatingResp } from "./api";

const route = getRouteApi("/masshtab/500");
const code = (r?: number) => (r ? String(r).padStart(2, "0") : undefined);

function Bars({ it }: { it: RatingItem }) {
  const vals = [it.rev2022, it.rev2023, it.rev2024, it.rev2025];
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-[3px] h-7 w-16" title="Выручка 2022–2025">
      {vals.map((v, i) => <i key={i} className={`flex-1 rounded-[1px] ${i === 3 ? "bg-[#d6402b]" : "bg-[#d4c8b6]"}`} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />)}
    </div>
  );
}

export default function RatingPage() {
  const init = route.useLoaderData();
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/masshtab/500" });
  const [data, setData] = useState<RatingResp | null>(init.rating);
  const [items, setItems] = useState<RatingItem[]>(init.rating?.items ?? []);
  const [filters, setFilters] = useState<Filters | null>(init.filters);
  const [ads, setAds] = useState<Ad[]>([]);
  const [q, setQ] = useState(search.q ?? "");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    mGet<{ ads: Ad[] }>({ action: "ads" }).then((r) => setAds(r.data?.ads ?? []));
    if (!filters) mGet<Filters>({ action: "filters" }).then((r) => setFilters(r.data));
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; if (init.rating) return; }
    setLoading(true);
    mGet<RatingResp>({ action: "rating", region: code(search.region), section: search.section, q: search.q }).then((r) => {
      setData(r.data);
      setItems(r.data?.items ?? []);
      setLoading(false);
    });
  }, [search.region, search.section, search.q]);

  const more = async () => {
    if (!data) return;
    setLoading(true);
    const r = await mGet<RatingResp>({ action: "rating", region: code(search.region), section: search.section, page: data.page + 1 });
    if (r.data) { setData(r.data); setItems((x) => [...x, ...r.data!.items]); }
    setLoading(false);
  };

  const setRegion = (v: string) => navigate({ search: (s) => ({ ...s, region: v ? Number(v) : undefined, q: undefined }), replace: true });
  const setSection = (v: string) => navigate({ search: (s) => ({ ...s, section: v || undefined, q: undefined }), replace: true });
  const regionName = filters?.regions.find((r) => r.code === code(search.region))?.name;
  const scope = [regionName, search.section].filter(Boolean).join(" · ") || "Вся Россия";
  const st = data?.stats;
  const sel = "bg-white border border-[#d9cfc0] rounded-full px-4 py-2 text-sm font-semibold focus:outline-none focus:border-[#14110f] cursor-pointer";

  return (
    <MShell active="/masshtab/500">
      <section className="relative bg-[#14110f] text-white overflow-hidden">
        <img src="https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/1292b992-95e1-4928-b8a9-a0860381b3ea.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#14110f] via-[#14110f]/85 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <Kicker className="text-[#ff7a66]">Рейтинг · выпуск 2026</Kicker>
          <h1 className={`${serif} font-bold text-5xl md:text-7xl mt-3 tracking-tight`}>Масштаб-500</h1>
          <p className="text-lg md:text-xl text-white/80 mt-3 max-w-2xl">Самые быстрорастущие компании России по выручке за 2022–2025 годы. Считаем сами по открытой отчётности ФНС — без анкет и платы за участие.</p>
          <div className="flex flex-wrap gap-8 md:gap-12 mt-8">
            {[
              [st ? String(st.companies) : "—", "компаний в рейтинге"],
              [st ? growthLabel(st.median) : "—", "медианный рост за 3 года"],
              [st ? String(st.regions) : "—", "регионов"],
              [st ? mln(st.revenue) : "—", "общая выручка 2025"],
            ].map(([v, l]) => (
              <div key={l}><div className={`${serif} font-bold text-3xl md:text-4xl`}>{v}</div><div className="text-xs text-white/60 mt-1">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="sticky top-16 md:top-16 z-20 bg-[#f6f2ea] py-4 border-b border-[#e2d9cb] flex flex-wrap gap-2 items-center">
          <button onClick={() => navigate({ search: {}, replace: true })} className={`rounded-full px-4 py-2 text-sm font-semibold ${!search.region && !search.section ? "bg-[#14110f] text-white" : "bg-white border border-[#d9cfc0]"}`}>Вся Россия</button>
          <select aria-label="Регион" className={sel} value={code(search.region) ?? ""} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Все регионы</option>
            {filters?.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
          <select aria-label="Отрасль" className={sel} value={search.section ?? ""} onChange={(e) => setSection(e.target.value)}>
            <option value="">Все отрасли</option>
            {filters?.sections.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <form className="ml-auto flex w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); navigate({ search: (s) => ({ ...s, q: q.trim() || undefined }), replace: true }); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти компанию или ИНН" className="flex-1 sm:w-60 bg-white border border-[#d9cfc0] rounded-l-full px-4 py-2 text-sm focus:outline-none" />
            <button aria-label="Найти" className="bg-[#14110f] text-white px-4 rounded-r-full"><Icon name="Search" size={16} /></button>
          </form>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-8 mt-6">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className={`${serif} font-bold text-2xl`}>{scope}</h2>
              {data?.local && <span className="text-xs text-[#8a8278]">место в общем рейтинге России — справа от названия</span>}
            </div>
            <div className={`bg-white border border-[#e2d9cb] rounded-lg overflow-hidden transition-opacity ${loading && !items.length ? "opacity-50" : ""}`}>
              <div className="hidden md:grid grid-cols-[56px_1fr_150px_110px_80px_100px] gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8a8278] border-b-2 border-[#14110f]">
                <span>#</span><span>Компания</span><span>Регион</span><span className="text-right">Выручка 2025</span><span>Динамика</span><span className="text-right">Рост за 3 года</span>
              </div>
              {!items.length && !loading && <div className="p-10 text-center text-[#5b5550]">По этим условиям компаний в рейтинге нет. Попробуйте другой регион или отрасль.</div>}
              {items.map((it) => {
                const n = companyName(it.name);
                const isOpen = open === it.inn;
                return (
                  <div key={it.inn} className="border-b border-[#efe8dc] last:border-0">
                    <button onClick={() => setOpen(isOpen ? null : it.inn)} className="w-full text-left grid grid-cols-[44px_1fr_auto] md:grid-cols-[56px_1fr_150px_110px_80px_100px] gap-3 px-4 py-3 items-center hover:bg-[#faf7f1]">
                      <span className={`${serif} font-bold text-xl ${it.rank <= 3 ? "text-[#d6402b]" : ""}`}>{it.rank}</span>
                      <span className="min-w-0">
                        <span className="font-bold block truncate">{n.title}</span>
                        <span className="text-xs text-[#8a8278] block truncate">
                          {n.opf}{it.section ? ` · ${it.section}` : ""}<span className="md:hidden"> · {it.region_name}</span>
                          {data?.local && it.rank_ru ? <span className="text-[#d6402b] font-semibold"> · №{it.rank_ru} в России</span> : null}
                        </span>
                      </span>
                      <span className="hidden md:block text-sm text-[#5b5550] truncate">{it.region_name}</span>
                      <span className="hidden md:block text-sm text-right font-semibold">{mln(it.rev2025)}</span>
                      <span className="hidden md:block"><Bars it={it} /></span>
                      <span className="text-right font-extrabold text-[#16803c]">{growthLabel(it.growth)}</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 md:pl-[72px] grid sm:grid-cols-4 gap-3 text-sm">
                        {([["2022", it.rev2022], ["2023", it.rev2023], ["2024", it.rev2024], ["2025", it.rev2025]] as const).map(([y, v]) => (
                          <div key={y} className="bg-[#f6f2ea] rounded px-3 py-2"><div className="text-[10px] text-[#8a8278]">Выручка {y}</div><div className="font-bold">{mln(v)}</div></div>
                        ))}
                        <div className="sm:col-span-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#5b5550]">
                          <span>ИНН {it.inn}</span>{it.staff ? <span>Сотрудников: {it.staff}</span> : null}
                          <a href={`/analytics/company/${it.inn}`} className="text-[#d6402b] font-bold">Полный отчёт о компании →</a>
                          <a href={`/masshtab/reklama?company=${encodeURIComponent(n.title)}#hero`} className="text-[#14110f] font-bold underline">Это ваша компания? Дайте интервью</a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {data?.more && (
              <button onClick={more} disabled={loading} className="mt-4 w-full border-2 border-[#14110f] font-bold py-3 rounded hover:bg-[#14110f] hover:text-white transition-colors disabled:opacity-50">
                {loading ? "Загружаем…" : "Показать ещё 50"}
              </button>
            )}
            <div className="mt-8 bg-white border border-[#e2d9cb] rounded-lg p-5 text-sm text-[#5b5550] leading-relaxed">
              <div className="font-bold text-[#14110f] mb-2">Как считаем</div>
              Берём бухгалтерскую отчётность компаний из ГИР БО ФНС и сравниваем выручку 2025 года с 2022-м. В рейтинг попадают компании с выручкой
              от 300 млн ₽ в 2025 году и от 30 млн ₽ в 2022-м, с отчётностью за все четыре года. Исключаем банки, страховые и инвестиционные компании,
              госорганы и специализированных застройщиков проектов, а также компании с неправдоподобными скачками отчётности. Проверено
              {data ? ` ${data.checked.toLocaleString("ru-RU")} компаний, прошли отбор ${data.eligible.toLocaleString("ru-RU")}` : ""}.
            </div>
          </div>
          <aside className="space-y-6">
            <AdSlot ad={pickAd(ads, "side")} />
            <div className="bg-[#14110f] text-white rounded-lg p-5">
              <Kicker className="text-[#ff7a66]">Для компаний из рейтинга</Kicker>
              <div className={`${serif} font-bold text-xl mt-2 leading-snug`}>Расскажите, как вы выросли</div>
              <p className="text-sm text-white/70 mt-2">Опубликуем интервью с основателем и карточкой компании. Для участников рейтинга — бесплатно.</p>
              <a href="/masshtab/reklama#hero" className="inline-block mt-4 bg-[#d6402b] text-white text-sm font-bold px-4 py-2 rounded">Оставить заявку</a>
            </div>
            <AdSlot ad={pickAd(ads, "side", 1)} />
          </aside>
        </div>

        <section className="mt-12 grid md:grid-cols-2 gap-8 items-start">
          <div>
            <Kicker>Вопрос по рейтингу</Kicker>
            <h2 className={`${serif} font-bold text-3xl mt-2`}>Нашли ошибку или хотите сертификат участника?</h2>
            <p className="text-[#5b5550] mt-3">Напишите редакции. Мы проверим данные и пришлём знак «Масштаб-500» для вашего сайта и презентаций.</p>
          </div>
          <LeadForm kind="rating" cta="Отправить в редакцию" placeholder="Компания, ИНН и ваш вопрос" />
        </section>
      </div>
    </MShell>
  );
}
