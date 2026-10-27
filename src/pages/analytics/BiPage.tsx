import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";
import { FaqSchema, ServiceSchema } from "@/components/biz/SeoSchema";
import DashboardView from "@/components/bi/DashboardView";
import { useRows } from "@/components/bi/useRows";
import ShareDialog from "@/components/bi/ShareDialog";
import { OwnedShare, ownedShares } from "@/components/bi/shareApi";
import WidgetEditor from "@/components/bi/WidgetEditor";
import MarketBenchmark from "@/components/bi/MarketBenchmark";
import { Dashboard, Dataset, Widget, autoWidgets, demoDataset, exportCsv, readFile } from "@/components/bi/biEngine";

const STORE = "matlabs_bi_v1";
const STORE_SHARE = "matlabs_bi_current_share";
const MAX_SAVE = 4_000_000;

const FAQ: [string, string][] = [
  ["Куда загружаются мои данные?", "Никуда: файл обрабатывается прямо в вашем браузере и не отправляется на сервер. Дашборд сохраняется только на этом устройстве — пока вы сами не нажмёте «Поделиться»."],
  ["Как показать дашборд коллегам?", "Нажмите «Поделиться» — получите ссылку, которая открывается без регистрации и работает 90 дней. Графики и фильтры доступны, изменить дашборд может только автор. Обновить данные можно по той же ссылке."],
  ["Какие файлы подходят?", "Excel (.xlsx, .xls) и CSV до 200 000 строк. Первая строка — заголовки колонок. Даты, числа и категории распознаются автоматически."],
  ["Чем отличается от Yandex DataLens или PIX BI?", "Не нужно ничего устанавливать и подключать: загрузили таблицу — получили дашборд за секунды. И есть то, чего нет в коробочных BI, — сравнение ваших показателей с рынком по данным ФНС."],
  ["Можно подключить 1С или CRM с автообновлением?", "Да, это услуга «Дашборды и BI под ключ»: подключим источники, настроим автообновление и доступы для команды."],
];

function load(): Dashboard | null {
  try { const s = localStorage.getItem(STORE); return s ? JSON.parse(s) : null; } catch { return null; }
}

export default function BiPage() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [edit, setEdit] = useState<Widget | null | "new">(null);
  const [tab, setTab] = useState<"dash" | "data">("dash");
  const [saved, setSaved] = useState<"ok" | "big" | "">("");
  const [share, setShare] = useState<OwnedShare | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const changeShare = (s: OwnedShare | null) => { setShare(s); if (s) localStorage.setItem(STORE_SHARE, s.id); else localStorage.removeItem(STORE_SHARE); };
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shareId = localStorage.getItem(STORE_SHARE);
    setShare((shareId && ownedShares().find(s => s.id === shareId)) || null);
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      const ds = demoDataset();
      setDash({ dataset: ds, widgets: autoWidgets(ds), filters: [] });
    } else {
      setDash(load());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!dash) { localStorage.removeItem(STORE); return; }
    const s = JSON.stringify(dash);
    if (s.length > MAX_SAVE) { setSaved("big"); return; }
    try { localStorage.setItem(STORE, s); setSaved("ok"); } catch { setSaved("big"); }
  }, [dash, loaded]);

  const start = (ds: Dataset) => { setDash({ dataset: ds, widgets: autoWidgets(ds), filters: [] }); setTab("dash"); setError(""); changeShare(null); };

  const onFile = useCallback(async (f?: File | null) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv|txt)$/i.test(f.name)) { setError("Нужен файл Excel (.xlsx, .xls) или CSV"); return; }
    if (f.size > 40 * 1024 * 1024) { setError("Файл больше 40 МБ — разделите его или закажите BI под ключ"); return; }
    setBusy(true); setError("");
    try {
      const ds = await readFile(f);
      if (!ds.rows.length || !ds.columns.length) throw new Error("В файле не найдено строк с данными");
      start(ds);
    } catch (e) { setError((e as Error).message || "Не удалось прочитать файл"); }
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ds = dash?.dataset;
  const rows = useRows(dash);
  const setD = (fn: (d: Dashboard) => Dashboard) => setDash(d => (d ? fn(d) : d));
  const saveWidget = (w: Widget) => { setDash(d => d && ({ ...d, widgets: d.widgets.some(x => x.id === w.id) ? d.widgets.map(x => (x.id === w.id ? w : x)) : [...d.widgets, w] })); setEdit(null); };

  const download = () => {
    if (!ds) return;
    const url = URL.createObjectURL(exportCsv(ds, rows));
    const a = document.createElement("a");
    a.href = url; a.download = `${ds.name}-filtered.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <BizShell title="Облачный BI бесплатно: дашборд из Excel за минуту + сравнение с рынком | МАТ-Лабс"
      description="Загрузите Excel или CSV и получите интерактивный дашборд: графики, фильтры, детализация кликом. Сравните выручку и рентабельность с компаниями вашей отрасли по данным ФНС. Бесплатно, данные не покидают браузер."
      path="/analytics/bi" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Облачный BI" }]}>
      <ServiceSchema name="Облачный BI МАТ-Лабс" description="Бесплатный дашборд из Excel и CSV в браузере со сравнением с рынком по данным ФНС" url="https://mat-labs.ru/analytics/bi" category="BI-система" />
      <FaqSchema items={FAQ} />

      {!dash ? (
        <>
          <header className="mb-8 max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-white/[0.04] px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-5"><Icon name="ShieldCheck" size={14} />Бесплатно · без регистрации · файл обрабатывается в браузере</div>
            <h1 className="font-['Oswald',sans-serif] text-4xl md:text-5xl font-bold leading-[1.05] mb-4">Дашборд из Excel <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">за одну минуту</span></h1>
            <p className="text-white/60 text-lg">Загрузите выгрузку продаж, CRM или 1С — графики, фильтры и детализация построятся автоматически. А потом сравните себя с рынком по данным ФНС.</p>
          </header>
          <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 md:p-14 text-center transition-colors mb-4 ${drag ? "border-violet-400 bg-violet-500/10" : "border-white/15 hover:border-violet-500/50 bg-white/[0.02]"}`}>
            <Icon name={busy ? "Loader2" : "UploadCloud"} size={42} className={`mx-auto text-violet-300 mb-3 ${busy ? "animate-spin" : ""}`} />
            <div className="text-white font-semibold text-lg">{busy ? "Читаем файл…" : "Перетащите файл сюда или нажмите, чтобы выбрать"}</div>
            <div className="text-sm text-white/50 mt-1">Excel (.xlsx, .xls) или CSV · до 200 000 строк · первая строка — заголовки</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
          </div>
          {error && <p className="text-rose-300 text-sm mb-4">{error}</p>}
          <div className="text-center mb-10">
            <button onClick={() => start(demoDataset())} data-demo className="text-sm text-violet-300 hover:text-white inline-flex items-center gap-1.5"><Icon name="Sparkles" size={15} />Нет файла под рукой? Откройте демо: продажи 1 200 сделок</button>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mb-10">
            {[
              ["Wand2", "Автодашборд", "Распознаём даты, суммы и категории и сами подбираем графики"],
              ["MousePointerClick", "Детализация кликом", "Нажмите на столбец — весь дашборд отфильтруется по этому значению"],
              ["Scale", "Сравнение с рынком", "Ваша выручка, маржа и выработка на сотрудника против отрасли по данным ФНС"],
              ["Share2", "Ссылка для коллег", "Поделитесь дашбордом с руководителем — откроется в браузере без регистрации"],
            ].map(([i, h, t]) => <Card key={h}><Icon name={i} fallback="Sparkles" size={20} className="text-cyan-300 mb-2" /><div className="font-semibold text-white mb-1">{h}</div><p className="text-sm text-white/55">{t}</p></Card>)}
          </div>
          <Card title="Вопросы" icon="HelpCircle">
            <div className="divide-y divide-white/5">{FAQ.map(([q, a]) => <details key={q} className="py-2.5"><summary className="cursor-pointer text-white text-sm font-medium">{q}</summary><p className="text-sm text-white/60 mt-1.5">{a}</p></details>)}</div>
          </Card>
        </>
      ) : ds && (
        <div className="space-y-5">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="font-['Oswald',sans-serif] text-2xl md:text-3xl font-bold">{ds.name}</h1>
              <div className="text-sm text-white/50">{rows.length.toLocaleString("ru-RU")} из {ds.rows.length.toLocaleString("ru-RU")} строк · {ds.columns.length} колонок
                {saved === "ok" && <span className="text-emerald-300/80"> · сохранено в браузере</span>}
                {share && <button onClick={() => setShareOpen(true)} className="text-violet-300 hover:text-white"> · опубликован по ссылке</button>}
                {saved === "big" && <span className="text-amber-300/80"> · слишком большой для автосохранения</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex bg-white/5 rounded-xl p-1">
                {([["dash", "Дашборд", "LayoutDashboard"], ["data", "Данные", "Table"]] as const).map(([k, l, i]) => (
                  <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${tab === k ? "bg-violet-600 text-white" : "text-white/60"}`}><Icon name={i} size={14} />{l}</button>
                ))}
              </div>
              <button onClick={() => setShareOpen(true)} className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-semibold text-white flex items-center gap-1.5"><Icon name="Share2" size={15} />{share ? "Ссылка" : "Поделиться"}</button>
              <button onClick={() => setEdit("new")} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="Plus" size={15} />График</button>
              <button onClick={() => setDash(d => d && ({ ...d, widgets: autoWidgets(d.dataset) }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5" title="Пересобрать автоматически"><Icon name="Wand2" size={15} />Авто</button>
              <button onClick={download} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="Download" size={15} />CSV</button>
              <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="Printer" size={15} />PDF</button>
              <button onClick={() => { if (confirm("Закрыть дашборд и загрузить другой файл?")) setDash(null); }} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="FileUp" size={15} />Новый файл</button>
            </div>
          </header>

          {tab === "data" && <DashboardFiltersOnly dash={dash!} setDash={setD} />}
          {tab === "dash" ? (
            <>
              <DashboardView dash={dash!} setDash={setD} onEdit={w => setEdit(w)} />
              <MarketBenchmark ds={ds} rows={rows} />
            </>
          ) : (
            <Card>
              <div className="flex flex-wrap gap-2 mb-3">
                {ds.columns.map(c => (
                  <span key={c.name} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70">
                    {c.name} <span className={c.type === "number" ? "text-cyan-300" : c.type === "date" ? "text-amber-300" : "text-violet-300"}>{c.type === "number" ? "число" : c.type === "date" ? "дата" : "текст"}</span>
                    {c.empty > 0 && <span className="text-white/35"> · пусто {c.empty}</span>}
                  </span>
                ))}
              </div>
              <div className="overflow-auto max-h-[520px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0d0d18]"><tr>{ds.columns.map(c => <th key={c.name} className="text-left text-xs text-white/45 font-normal py-2 pr-4 whitespace-nowrap">{c.name}</th>)}</tr></thead>
                  <tbody>
                    {rows.slice(0, 300).map((r, i) => (
                      <tr key={i} className="border-t border-white/5">{ds.columns.map(c => <td key={c.name} className={`py-1.5 pr-4 whitespace-nowrap ${c.type === "number" ? "text-right text-white" : "text-white/70"}`}>{r[c.name] == null ? "" : typeof r[c.name] === "number" ? (r[c.name] as number).toLocaleString("ru-RU") : String(r[c.name])}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 300 && <p className="text-xs text-white/40 mt-2">Показаны первые 300 строк — все строки участвуют в расчётах и выгрузке CSV.</p>}
            </Card>
          )}

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-white">Нужно автообновление из 1С, CRM и рекламы?</div>
              <p className="text-sm text-white/55">Подключим источники, настроим доступы для команды и рассылку отчётов — от 60 000 ₽ за 10 дней.</p>
            </div>
            <Link to="/analytics/services/dashboards" className="shrink-0 px-5 py-2.5 rounded-xl bg-white text-[#10101c] font-semibold text-sm">BI под ключ</Link>
          </div>
        </div>
      )}

      {shareOpen && dash && <ShareDialog dash={dash} existing={share} onChange={changeShare} onClose={() => setShareOpen(false)} />}
      {edit && ds && <WidgetEditor ds={ds} initial={edit === "new" ? undefined : edit} onSave={saveWidget} onClose={() => setEdit(null)} />}
    </BizShell>
  );
}

function DashboardFiltersOnly({ dash, setDash }: { dash: Dashboard; setDash: (fn: (d: Dashboard) => Dashboard) => void }) {
  return <div className="[&>div:nth-child(2)]:hidden"><DashboardView dash={{ ...dash, widgets: [] }} setDash={setDash} readOnly /></div>;
}