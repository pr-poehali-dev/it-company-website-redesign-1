import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";
import { FaqSchema, ServiceSchema } from "@/components/biz/SeoSchema";
import BiWidget from "@/components/bi/BiWidget";
import WidgetEditor from "@/components/bi/WidgetEditor";
import MarketBenchmark from "@/components/bi/MarketBenchmark";
import { Dashboard, Dataset, Filter, Widget, applyFilters, autoWidgets, demoDataset, exportCsv, readFile } from "@/components/bi/biEngine";

const STORE = "matlabs_bi_v1";
const MAX_SAVE = 4_000_000;

const FAQ: [string, string][] = [
  ["Куда загружаются мои данные?", "Никуда: файл обрабатывается прямо в вашем браузере и не отправляется на сервер. Дашборд сохраняется только на этом устройстве."],
  ["Какие файлы подходят?", "Excel (.xlsx, .xls) и CSV до 200 000 строк. Первая строка — заголовки колонок. Даты, числа и категории распознаются автоматически."],
  ["Чем отличается от Yandex DataLens или PIX BI?", "Не нужно ничего устанавливать и подключать: загрузили таблицу — получили дашборд за секунды. И есть то, чего нет в коробочных BI, — сравнение ваших показателей с рынком по данным ФНС."],
  ["Можно подключить 1С или CRM с автообновлением?", "Да, это услуга «Дашборды и BI под ключ»: подключим источники, настроим автообновление и доступы для команды."],
];

function load(): Dashboard | null {
  try { const s = localStorage.getItem(STORE); return s ? JSON.parse(s) : null; } catch { return null; }
}

export default function BiPage() {
  const [dash, setDash] = useState<Dashboard | null>(() => (new URLSearchParams(window.location.search).get("demo") === "1" ? null : load()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [edit, setEdit] = useState<Widget | null | "new">(null);
  const [tab, setTab] = useState<"dash" | "data">("dash");
  const [saved, setSaved] = useState<"ok" | "big" | "">("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") === "1" && !dash) {
      const ds = demoDataset();
      setDash({ dataset: ds, widgets: autoWidgets(ds), filters: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dash) { localStorage.removeItem(STORE); return; }
    const s = JSON.stringify(dash);
    if (s.length > MAX_SAVE) { setSaved("big"); return; }
    try { localStorage.setItem(STORE, s); setSaved("ok"); } catch { setSaved("big"); }
  }, [dash]);

  const start = (ds: Dataset) => { setDash({ dataset: ds, widgets: autoWidgets(ds), filters: [] }); setTab("dash"); setError(""); };

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
  }, []);

  const ds = dash?.dataset;
  const rows = useMemo(() => (ds && dash ? applyFilters(ds.rows, dash.filters) : []), [ds, dash]);
  const filterable = useMemo(() => (ds ? ds.columns.filter(c => c.type !== "number" && c.unique > 1 && c.unique <= 300) : []), [ds]);
  const values = useCallback((col: string) => {
    if (!ds) return [];
    const m = new Map<string, number>();
    ds.rows.forEach(r => { const k = String(r[col] ?? "—"); m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [ds]);

  const setFilter = (column: string, vals: string[]) => setDash(d => d && ({ ...d, filters: [...d.filters.filter(f => f.column !== column), ...(vals.length ? [{ column, values: vals }] : [])] }));
  const drill = (column: string, value: string) => {
    const cur = dash?.filters.find(f => f.column === column)?.values || [];
    setFilter(column, cur.length === 1 && cur[0] === value ? [] : [value]);
  };
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
            <div className="inline-flex items-center gap-2 bg-white/[0.04] px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-5"><Icon name="ShieldCheck" size={14} />Бесплатно · без регистрации · данные не уходят на сервер</div>
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
              ["Lock", "Приватно", "Файл обрабатывается в браузере и не загружается на наши серверы"],
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
                {saved === "big" && <span className="text-amber-300/80"> · слишком большой для автосохранения</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex bg-white/5 rounded-xl p-1">
                {([["dash", "Дашборд", "LayoutDashboard"], ["data", "Данные", "Table"]] as const).map(([k, l, i]) => (
                  <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${tab === k ? "bg-violet-600 text-white" : "text-white/60"}`}><Icon name={i} size={14} />{l}</button>
                ))}
              </div>
              <button onClick={() => setEdit("new")} className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-semibold text-white flex items-center gap-1.5"><Icon name="Plus" size={15} />График</button>
              <button onClick={() => setDash(d => d && ({ ...d, widgets: autoWidgets(d.dataset) }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5" title="Пересобрать автоматически"><Icon name="Wand2" size={15} />Авто</button>
              <button onClick={download} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="Download" size={15} />CSV</button>
              <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="Printer" size={15} />PDF</button>
              <button onClick={() => { if (confirm("Закрыть дашборд и загрузить другой файл?")) setDash(null); }} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="FileUp" size={15} />Новый файл</button>
            </div>
          </header>

          {filterable.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <Icon name="Filter" size={15} className="text-white/40" />
              {filterable.slice(0, 6).map(c => {
                const cur = dash!.filters.find(f => f.column === c.name)?.values || [];
                return (
                  <details key={c.name} className="relative">
                    <summary className={`list-none cursor-pointer px-3 py-1.5 rounded-xl text-sm border flex items-center gap-1.5 ${cur.length ? "border-violet-500/60 bg-violet-600/20 text-white" : "border-white/10 text-white/65"}`}>
                      {c.name}{cur.length ? `: ${cur.length === 1 ? cur[0] : cur.length}` : ""}<Icon name="ChevronDown" size={13} />
                    </summary>
                    <div className="absolute z-30 mt-1 w-64 max-h-72 overflow-y-auto bg-[#12121f] border border-white/10 rounded-xl p-2 shadow-2xl">
                      {values(c.name).slice(0, 200).map(([v, n]) => (
                        <label key={v} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 text-sm text-white/80 cursor-pointer">
                          <input type="checkbox" checked={cur.includes(v)} onChange={e => setFilter(c.name, e.target.checked ? [...cur, v] : cur.filter(x => x !== v))} className="accent-violet-500" />
                          <span className="truncate flex-1">{v}</span><span className="text-[11px] text-white/35">{n}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                );
              })}
              {dash!.filters.length > 0 && <button onClick={() => setDash(d => d && ({ ...d, filters: [] }))} className="text-sm text-violet-300 hover:text-white">Сбросить фильтры</button>}
              <span className="text-[11px] text-white/35 ml-auto">Клик по столбцу или сектору — фильтр по значению</span>
            </div>
          )}

          {tab === "dash" ? (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                {dash!.widgets.map(w => (
                  <BiWidget key={w.id} w={w} ds={ds} rows={rows} onEdit={() => setEdit(w)} onDrill={drill}
                    onRemove={() => setDash(d => d && ({ ...d, widgets: d.widgets.filter(x => x.id !== w.id) }))} />
                ))}
                <button onClick={() => setEdit("new")} className="border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-2xl p-6 text-white/45 hover:text-white flex flex-col items-center justify-center gap-2 min-h-[120px]">
                  <Icon name="Plus" size={22} />Добавить график
                </button>
              </div>
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

      {edit && ds && <WidgetEditor ds={ds} initial={edit === "new" ? undefined : edit} onSave={saveWidget} onClose={() => setEdit(null)} />}
    </BizShell>
  );
}
