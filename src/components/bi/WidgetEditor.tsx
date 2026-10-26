import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AGG_LABEL, Agg, CHART_LABEL, ChartType, Dataset, Widget, uid } from "./biEngine";

const sel = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 [&>option]:bg-[#12121f]";

export default function WidgetEditor({ ds, initial, onSave, onClose }: { ds: Dataset; initial?: Widget; onSave: (w: Widget) => void; onClose: () => void }) {
  const firstNum = ds.columns.find(c => c.type === "number")?.name;
  const firstCat = ds.columns.find(c => c.type !== "number")?.name;
  const [w, setW] = useState<Widget>(initial || { id: uid(), title: "", type: "bar", dim: firstCat, measure: firstNum, agg: firstNum ? "sum" : "count", limit: 12, sort: "value", dateGrain: "month" });
  const set = <K extends keyof Widget>(k: K, v: Widget[K]) => setW(p => ({ ...p, [k]: v }));
  const dimCol = ds.columns.find(c => c.name === w.dim);
  const numericAgg = w.agg !== "count" && w.agg !== "uniq";
  const autoTitle = () => {
    const m = w.agg === "count" ? "Количество" : `${AGG_LABEL[w.agg]}: ${w.measure || ""}`;
    return w.type === "kpi" || !w.dim ? m : `${m} по «${w.dim}»`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#10101c] border border-white/10 rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-white text-lg">{initial ? "Настройка графика" : "Новый график"}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-4">
          {(Object.keys(CHART_LABEL) as ChartType[]).map(t => (
            <button key={t} onClick={() => set("type", t)} className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] ${w.type === t ? "border-violet-500/70 bg-violet-600/20 text-white" : "border-white/10 text-white/55 hover:text-white"}`}>
              <Icon name={CHART_LABEL[t][1]} fallback="BarChart3" size={17} />{CHART_LABEL[t][0]}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {w.type !== "kpi" && (
            <label className="block text-xs text-white/50">Группировать по (ось / категории)
              <select value={w.dim || ""} onChange={e => set("dim", e.target.value || undefined)} className={`${sel} mt-1`}>
                {ds.columns.map(c => <option key={c.name} value={c.name}>{c.name} · {c.type === "date" ? "дата" : c.type === "number" ? "число" : `${c.unique} знач.`}</option>)}
              </select>
            </label>
          )}
          {dimCol?.type === "date" && w.type !== "kpi" && (
            <div className="flex gap-1.5">
              {([["day", "Дни"], ["month", "Месяцы"], ["quarter", "Кварталы"], ["year", "Годы"]] as const).map(([g, l]) => (
                <button key={g} onClick={() => set("dateGrain", g)} className={`flex-1 text-xs py-1.5 rounded-lg border ${w.dateGrain === g ? "border-violet-500/70 bg-violet-600/20 text-white" : "border-white/10 text-white/55"}`}>{l}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-white/50">Что считаем
              <select value={w.agg} onChange={e => set("agg", e.target.value as Agg)} className={`${sel} mt-1`}>
                {(Object.keys(AGG_LABEL) as Agg[]).map(a => <option key={a} value={a}>{AGG_LABEL[a]}</option>)}
              </select>
            </label>
            <label className="block text-xs text-white/50">Поле
              <select value={w.measure || ""} onChange={e => set("measure", e.target.value || undefined)} disabled={w.agg === "count"} className={`${sel} mt-1 disabled:opacity-40`}>
                {w.agg === "count" && <option value="">—</option>}
                {ds.columns.filter(c => (numericAgg ? c.type === "number" : true)).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>
          {w.type !== "kpi" && dimCol?.type !== "date" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-white/50">Показывать категорий
                <select value={w.limit} onChange={e => set("limit", Number(e.target.value))} className={`${sel} mt-1`}>
                  {[5, 8, 12, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="block text-xs text-white/50">Сортировка
                <select value={w.sort} onChange={e => set("sort", e.target.value as Widget["sort"])} className={`${sel} mt-1`}>
                  <option value="value">По значению</option><option value="label">По названию</option>
                </select>
              </label>
            </div>
          )}
          <label className="block text-xs text-white/50">Заголовок
            <input value={w.title} onChange={e => set("title", e.target.value)} placeholder={autoTitle()} className={`${sel} mt-1 placeholder-white/30`} />
          </label>
        </div>
        <button onClick={() => onSave({ ...w, title: w.title.trim() || autoTitle(), measure: w.agg === "count" ? undefined : w.measure })}
          className="w-full mt-5 bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-3 rounded-xl font-semibold text-white">Сохранить</button>
      </div>
    </div>
  );
}
