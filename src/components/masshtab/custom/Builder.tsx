import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { serif } from "../MShell";
import { type Catalog, type CustomIssue, type ModuleSel, customPost, rub } from "./customApi";

type Tab = "uch" | "posts" | "archive" | "rating" | "market" | "extra";
const TABS: [Tab, string, string][] = [
  ["uch", "Обучение · учисьпро.рф", "GraduationCap"],
  ["posts", "Статьи журнала", "Newspaper"],
  ["archive", "Вышедшие номера", "BookOpen"],
  ["rating", "Рейтинг «Масштаб-500»", "Trophy"],
  ["market", "Портрет рынка", "PieChart"],
  ["extra", "Индикаторы и рабочие страницы", "LayoutGrid"],
];
const EXTRA: { kind: "indicators" | "quotes" | "notes"; icon: string; title: string; text: string }[] = [
  { kind: "indicators", icon: "LineChart", title: "Индикаторы рынка", text: "Ключевая ставка ЦБ, курсы доллара, евро и юаня и дюжина главных новостей экономики — на день сборки PDF." },
  { kind: "quotes", icon: "Quote", title: "Мысли для руководителя", text: "Восемь цитат об управлении, деньгах и людях — от Друкера, Баффетта и других — с источниками." },
  { kind: "notes", icon: "NotebookPen", title: "Рабочие страницы", text: "План на месяц из трёх главных задач, таблица ключевых цифр «план — факт» и страница для заметок." },
];
const input = "w-full bg-white border border-[#cfc3b2] rounded px-3 py-2.5 text-sm text-[#14110f] placeholder:text-[#8a8278] outline-none focus:border-[#d6402b]";

const keyOf = (m: ModuleSel): string => {
  switch (m.kind) {
    case "post": return `p${m.id}`;
    case "archive": return `a${m.id}`;
    case "uch": return `u${m.id}`;
    case "rating": return `r${m.region}-${m.section}`;
    case "market": return `m${m.region}-${m.section}`;
    default: return m.kind;
  }
};

export default function Builder({ catalog, issue, onSaved, onCancel }: { catalog: Catalog; issue: CustomIssue | null; onSaved: (i: CustomIssue, pay: boolean) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(issue?.title || "Мой «Масштаб»");
  const [coverName, setCoverName] = useState(issue?.cover_name || "");
  const [coverCompany, setCoverCompany] = useState(issue?.cover_company || "");
  const [mods, setMods] = useState<ModuleSel[]>(issue?.modules || []);
  const [tab, setTab] = useState<Tab>("uch");
  const [uchTopic, setUchTopic] = useState("");
  const [uq, setUq] = useState("");
  const [mRegion, setMRegion] = useState("");
  const [mSection, setMSection] = useState("");
  const [q, setQ] = useState("");
  const [rubric, setRubric] = useState("");
  const [region, setRegion] = useState("");
  const [section, setSection] = useState("");
  const [top, setTop] = useState(50);
  const [busy, setBusy] = useState<"" | "save" | "pay">("");
  const [err, setErr] = useState("");

  const keys = useMemo(() => new Set(mods.map(keyOf)), [mods]);
  const full = mods.length >= catalog.max_modules;
  const rubrics = useMemo(() => Array.from(new Set(catalog.posts.map((p) => p.rubric).filter(Boolean))), [catalog.posts]);
  const regionName = (c: string) => catalog.regions.find((r) => r.code === c)?.name || "";

  const uchItems = catalog.uch.filter((u) => (!uchTopic || u.topic === uchTopic) && (!uq || u.title.toLowerCase().includes(uq.toLowerCase())));
  const uchCount = (t: string) => catalog.uch.filter((u) => u.topic === t).length;
  const posts = catalog.posts.filter((p) => (!rubric || p.rubric === rubric) && (!q || p.title.toLowerCase().includes(q.toLowerCase())));

  const toggle = (m: ModuleSel) => {
    setErr("");
    const k = keyOf(m);
    if (keys.has(k)) return setMods(mods.filter((x) => keyOf(x) !== k));
    if (full) return setErr(`В выпуске может быть не больше ${catalog.max_modules} модулей`);
    setMods([...mods, m]);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= mods.length) return;
    const next = [...mods];
    [next[i], next[j]] = [next[j], next[i]];
    setMods(next);
  };

  const label = (m: ModuleSel): [string, string] => {
    if (m.kind === "post") {
      const p = catalog.posts.find((x) => x.id === m.id);
      return [p?.rubric || "Статья", p?.title || "Материал недоступен"];
    }
    if (m.kind === "archive") {
      for (const a of catalog.archive) {
        const it = a.articles.find((x) => x.id === m.id);
        if (it) return [`${a.issue_title} · с. ${it.from}–${it.to}`, it.title];
      }
      return ["Архив", "Материал недоступен"];
    }
    if (m.kind === "uch") {
      const u = catalog.uch.find((x) => x.slug === m.id);
      const t = catalog.uch_topics.find((x) => x.slug === u?.topic)?.name;
      return [`Обучение · учисьпро.рф${t ? ` · ${t}` : ""}`, u?.title || "Материал учисьпро.рф"];
    }
    if (m.kind === "market") {
      return ["Портрет рынка", [regionName(m.region) || "Россия", m.section || "все отрасли"].join(" · ")];
    }
    if (m.kind === "quotes") return ["Мысли для руководителя", "Восемь цитат об управлении, деньгах и людях"];
    if (m.kind === "notes") return ["Рабочие страницы", "План на месяц, ключевые цифры и заметки"];
    if (m.kind === "rating") {
      const f = [regionName(m.region), m.section].filter(Boolean).join(" · ") || "вся Россия, все отрасли";
      return ["Рейтинг «Масштаб-500»", `Топ-${m.top}: ${f}`];
    }
    return ["Индикаторы рынка", "Ставка ЦБ, курсы валют и главные новости экономики на день сборки"];
  };

  const submit = async (pay: boolean) => {
    setErr("");
    if (pay && !mods.length) return setErr("Добавьте в выпуск хотя бы один модуль");
    setBusy(pay ? "pay" : "save");
    const r = await customPost<{ issue: CustomIssue }>({ action: "save", id: issue?.id, title, cover_name: coverName, cover_company: coverCompany, modules: mods });
    setBusy("");
    if (r.error || !r.issue) return setErr(r.error || "Не удалось сохранить");
    onSaved(r.issue, pay);
  };

  const pick = (on: boolean) => `shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center ${on ? "bg-[#d6402b] border-[#d6402b] text-white" : "border-[#cfc3b2] text-transparent group-hover:border-[#d6402b]"}`;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
      <section className="min-w-0">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(([t, l, ic]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold border-2 ${tab === t ? "bg-[#14110f] border-[#14110f] text-white" : "border-[#14110f] text-[#14110f] hover:bg-white"}`}>
              <Icon name={ic} size={16} />{l}
            </button>
          ))}
        </div>

        <div className="mt-5 bg-white border border-[#e2d9cb] rounded-lg p-4 md:p-5">
          {tab === "uch" && (
            <>
              <div className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-amber-400 text-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-white/85">Проект нашей команды</div>
                  <div className="font-bold text-lg leading-snug">Обучающие материалы образовательной платформы учисьпро.рф</div>
                  <div className="text-sm text-white/85">Нейросети, профессии, управление, школа и ЕГЭ, советы родителям — полные статьи с таблицами и примерами.</div>
                </div>
                <a href="https://xn--h1amcedk2a6b.xn--p1ai/?utm_source=masshtab&utm_medium=builder" target="_blank" rel="noopener" className="shrink-0 bg-white/20 hover:bg-white/30 rounded px-3 py-2 text-sm font-bold">учисьпро.рф ↗</a>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" onClick={() => setUchTopic("")} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${!uchTopic ? "bg-[#14110f] text-white border-[#14110f]" : "border-[#cfc3b2] hover:border-[#14110f]"}`}>Все темы · {catalog.uch.length}</button>
                {catalog.uch_topics.filter((t) => uchCount(t.slug)).map((t) => (
                  <button key={t.slug} type="button" onClick={() => setUchTopic(t.slug)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${uchTopic === t.slug ? "bg-[#14110f] text-white border-[#14110f]" : "border-[#cfc3b2] hover:border-[#14110f]"}`}>
                    {t.name} · {uchCount(t.slug)}
                  </button>
                ))}
              </div>
              <input value={uq} onChange={(e) => setUq(e.target.value)} placeholder="Поиск по заголовку" className={`${input} mt-3`} />
              <div className="mt-2 divide-y divide-[#e2d9cb] max-h-[560px] overflow-y-auto">
                {uchItems.map((u) => {
                  const on = keys.has(`u${u.slug}`);
                  return (
                    <button key={u.slug} type="button" onClick={() => toggle({ kind: "uch", id: u.slug })} className="group w-full text-left flex gap-3 py-3 items-start">
                      <span className={pick(on)}><Icon name="Check" size={15} /></span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-extrabold tracking-[0.12em] uppercase text-fuchsia-700">{catalog.uch_topics.find((t) => t.slug === u.topic)?.name}{u.read_min ? ` · ${u.read_min} мин` : ""}</span>
                        <span className={`block ${serif} font-bold leading-snug group-hover:text-[#d6402b]`}>{u.title}</span>
                        {u.lead && <span className="block text-sm text-[#5b5550] mt-1 line-clamp-2">{u.lead}</span>}
                      </span>
                    </button>
                  );
                })}
                {!uchItems.length && <div className="py-8 text-center text-sm text-[#8a8278]">{catalog.uch.length ? "Ничего не нашлось" : "Материалы учисьпро.рф загружаются — обновите страницу через минуту"}</div>}
              </div>
            </>
          )}

          {tab === "posts" && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по заголовку" className={input} />
                <select value={rubric} onChange={(e) => setRubric(e.target.value)} className={`${input} sm:w-64`}>
                  <option value="">Все рубрики</option>
                  {rubrics.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="mt-3 divide-y divide-[#e2d9cb] max-h-[560px] overflow-y-auto">
                {posts.map((p) => {
                  const on = keys.has(`p${p.id}`);
                  return (
                    <button key={p.id} type="button" onClick={() => toggle({ kind: "post", id: p.id })} className="group w-full text-left flex gap-3 py-3 items-start">
                      <span className={pick(on)}><Icon name="Check" size={15} /></span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#8a8278]">{p.rubric}{p.read_min ? ` · ${p.read_min} мин` : ""}</span>
                        <span className={`block ${serif} font-bold leading-snug group-hover:text-[#d6402b]`}>{p.title}</span>
                        {p.lead && <span className="block text-sm text-[#5b5550] mt-1 line-clamp-2">{p.lead}</span>}
                      </span>
                    </button>
                  );
                })}
                {!posts.length && <div className="py-8 text-center text-sm text-[#8a8278]">Ничего не нашлось</div>}
              </div>
            </>
          )}

          {tab === "archive" && catalog.archive.map((a) => (
            <div key={a.issue} className="mb-4 last:mb-0">
              <div className={`${serif} font-bold text-xl`}>{a.issue_title}</div>
              <p className="text-xs text-[#8a8278] mt-1">Полосы входят в ваш выпуск в том виде, в каком вышли в номере.</p>
              <div className="mt-2 divide-y divide-[#e2d9cb]">
                {a.articles.map((it) => {
                  const on = keys.has(`a${it.id}`);
                  return (
                    <button key={it.id} type="button" onClick={() => toggle({ kind: "archive", id: it.id })} className="group w-full text-left flex gap-3 py-3 items-start">
                      <span className={pick(on)}><Icon name="Check" size={15} /></span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#8a8278]">{it.rubric} · полосы {it.from}–{it.to}</span>
                        <span className={`block ${serif} font-bold leading-snug group-hover:text-[#d6402b]`}>{it.title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {tab === "rating" && (
            <div>
              <p className="text-sm text-[#5b5550]">Самые быстрорастущие компании России по открытой отчётности ФНС. Выберите свой регион и отрасль — получите таблицу именно по своему рынку.</p>
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                <label className="text-xs font-bold text-[#8a8278]">Регион
                  <select value={region} onChange={(e) => setRegion(e.target.value)} className={`${input} mt-1`}>
                    <option value="">Вся Россия</option>
                    {catalog.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#8a8278]">Отрасль
                  <select value={section} onChange={(e) => setSection(e.target.value)} className={`${input} mt-1`}>
                    <option value="">Все отрасли</option>
                    {catalog.sections.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#8a8278]">Сколько компаний
                  <select value={top} onChange={(e) => setTop(Number(e.target.value))} className={`${input} mt-1`}>
                    {[10, 20, 50, 100].map((n) => <option key={n} value={n}>Топ-{n}</option>)}
                  </select>
                </label>
              </div>
              <button type="button" onClick={() => toggle({ kind: "rating", region, section, top })} disabled={keys.has(`r${region}-${section}`)}
                className="mt-4 inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold px-4 py-2.5 rounded hover:bg-[#b93522] disabled:opacity-50">
                <Icon name="Plus" size={16} />{keys.has(`r${region}-${section}`) ? "Такая выборка уже в выпуске" : "Добавить рейтинг в выпуск"}
              </button>
              <p className="text-xs text-[#8a8278] mt-3">Можно добавить несколько рейтингов: например, по своему региону и по своей отрасли.</p>
            </div>
          )}

          {tab === "market" && (
            <div>
              <p className="text-sm text-[#5b5550]">Сколько компаний на вашем рынке, их общая выручка, доля убыточных, медианная выручка и маржа для микро-, малых и средних компаний, популярные системы налогообложения — по открытым данным ФНС. Удобно сравнить свою компанию с типичной.</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <label className="text-xs font-bold text-[#8a8278]">Регион
                  <select value={mRegion} onChange={(e) => setMRegion(e.target.value)} className={`${input} mt-1`}>
                    <option value="">Вся Россия</option>
                    {catalog.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#8a8278]">Отрасль
                  <select value={mSection} onChange={(e) => setMSection(e.target.value)} className={`${input} mt-1`}>
                    <option value="">Все отрасли</option>
                    {catalog.sections.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <button type="button" onClick={() => toggle({ kind: "market", region: mRegion, section: mSection })} disabled={(!mRegion && !mSection) || keys.has(`m${mRegion}-${mSection}`)}
                className="mt-4 inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold px-4 py-2.5 rounded hover:bg-[#b93522] disabled:opacity-50">
                <Icon name="Plus" size={16} />{!mRegion && !mSection ? "Выберите регион или отрасль" : keys.has(`m${mRegion}-${mSection}`) ? "Такой портрет уже в выпуске" : "Добавить портрет рынка"}
              </button>
            </div>
          )}

          {tab === "extra" && (
            <div className="grid sm:grid-cols-3 gap-3">
              {EXTRA.map((x) => {
                const on = keys.has(x.kind);
                return (
                  <button key={x.kind} type="button" onClick={() => toggle({ kind: x.kind })}
                    className={`text-left rounded-lg border-2 p-4 flex flex-col ${on ? "border-[#d6402b] bg-[#fdf1ee]" : "border-[#e2d9cb] hover:border-[#14110f]"}`}>
                    <span className="flex items-center justify-between"><Icon name={x.icon} size={22} className="text-[#d6402b]" /><span className={pick(on)}><Icon name="Check" size={15} /></span></span>
                    <span className="font-bold mt-3">{x.title}</span>
                    <span className="text-sm text-[#5b5550] mt-1">{x.text}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <aside className="lg:sticky lg:top-24 bg-white border-2 border-[#14110f] rounded-lg overflow-hidden">
        <div className="bg-[#14110f] text-white p-5">
          <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#ff8a73]">Персональная обложка</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Название выпуска"
            className={`mt-2 w-full bg-transparent border-b border-white/30 focus:border-[#ff8a73] outline-none ${serif} font-bold text-2xl py-1`} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <input value={coverName} onChange={(e) => setCoverName(e.target.value)} maxLength={100} placeholder="Имя на обложке"
              className="bg-white/10 rounded px-3 py-2 text-sm placeholder:text-white/40 outline-none focus:bg-white/15" />
            <input value={coverCompany} onChange={(e) => setCoverCompany(e.target.value)} maxLength={100} placeholder="Компания"
              className="bg-white/10 rounded px-3 py-2 text-sm placeholder:text-white/40 outline-none focus:bg-white/15" />
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-baseline justify-between">
            <div className="font-bold">Содержание выпуска</div>
            <div className="text-xs text-[#8a8278]">{mods.length} из {catalog.max_modules}</div>
          </div>
          {mods.length ? (
            <ol className="mt-3 space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {mods.map((m, i) => {
                const [k, t] = label(m);
                return (
                  <li key={keyOf(m)} className="flex gap-2 items-start border-b border-[#e2d9cb] pb-2">
                    <span className={`${serif} font-bold text-lg text-[#d6402b] w-6 shrink-0 leading-6`}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-extrabold tracking-[0.12em] uppercase text-[#8a8278]">{k}</span>
                      <span className="block text-sm font-semibold leading-snug">{t}</span>
                    </span>
                    <span className="flex flex-col shrink-0">
                      <button type="button" aria-label="Выше" onClick={() => move(i, -1)} disabled={!i} className="text-[#8a8278] hover:text-[#14110f] disabled:opacity-20"><Icon name="ChevronUp" size={16} /></button>
                      <button type="button" aria-label="Ниже" onClick={() => move(i, 1)} disabled={i === mods.length - 1} className="text-[#8a8278] hover:text-[#14110f] disabled:opacity-20"><Icon name="ChevronDown" size={16} /></button>
                    </span>
                    <button type="button" aria-label="Убрать" onClick={() => toggle(m)} className="text-[#8a8278] hover:text-[#d6402b] shrink-0 pt-1"><Icon name="X" size={16} /></button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-[#8a8278]">Отметьте статьи, полосы номеров, рейтинг и индикаторы слева — они появятся здесь в порядке добавления.</p>
          )}
          <div className="mt-5 pt-4 border-t-2 border-[#14110f] flex items-baseline justify-between">
            <span className="text-sm font-semibold">Разовая оплата</span>
            <span className={`${serif} font-bold text-3xl`}>{rub(catalog.price)}</span>
          </div>
          <p className="text-xs text-[#8a8278] mt-1">PDF собирается сразу после оплаты и остаётся в кабинете. Обложка, содержание и нумерация — автоматически.</p>
          {err && <p className="text-sm text-[#d6402b] mt-3">{err}</p>}
          <button type="button" onClick={() => submit(true)} disabled={!!busy || !mods.length}
            className="mt-4 w-full bg-[#d6402b] hover:bg-[#b93522] text-white font-bold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === "pay" ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="CreditCard" size={18} />}Оплатить {rub(catalog.price)} и получить PDF
          </button>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => submit(false)} disabled={!!busy} className="flex-1 border-2 border-[#14110f] font-bold py-2 rounded text-sm hover:bg-[#14110f] hover:text-white disabled:opacity-50">
              {busy === "save" ? "Сохраняем…" : "Сохранить черновик"}
            </button>
            <button type="button" onClick={onCancel} className="px-4 text-sm font-semibold text-[#8a8278] hover:text-[#14110f]">Отмена</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
