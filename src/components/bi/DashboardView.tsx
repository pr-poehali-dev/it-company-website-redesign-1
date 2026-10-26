import { useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import BiWidget from "./BiWidget";
import { Dashboard, Widget } from "./biEngine";
import { useRows } from "./useRows";

interface Props {
  dash: Dashboard;
  setDash: (fn: (d: Dashboard) => Dashboard) => void;
  readOnly?: boolean;
  onEdit?: (w: Widget | "new") => void;
}

export default function DashboardView({ dash, setDash, readOnly, onEdit }: Props) {
  const ds = dash.dataset;
  const rows = useRows(dash);
  const filterable = useMemo(() => ds.columns.filter(c => c.type === "text" && c.unique > 1 && c.unique <= 300), [ds]);
  const values = useCallback((col: string) => {
    const m = new Map<string, number>();
    ds.rows.forEach(r => { const k = String(r[col] ?? "—"); m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [ds]);
  const setFilter = (column: string, vals: string[]) => setDash(d => ({ ...d, filters: [...d.filters.filter(f => f.column !== column), ...(vals.length ? [{ column, values: vals }] : [])] }));
  const drill = (column: string, value: string) => {
    const cur = dash.filters.find(f => f.column === column)?.values || [];
    setFilter(column, cur.length === 1 && cur[0] === value ? [] : [value]);
  };

  return (
    <>
      {filterable.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <Icon name="Filter" size={15} className="text-white/40" />
          {filterable.slice(0, 6).map(c => {
            const cur = dash.filters.find(f => f.column === c.name)?.values || [];
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
          {dash.filters.length > 0 && <button onClick={() => setDash(d => ({ ...d, filters: [] }))} className="text-sm text-violet-300 hover:text-white">Сбросить фильтры</button>}
          <span className="text-[11px] text-white/35 ml-auto hidden md:inline">Клик по столбцу или сектору — фильтр по значению</span>
        </div>
      )}
      <div className="grid md:grid-cols-4 gap-4">
        {dash.widgets.map(w => (
          <BiWidget key={w.id} w={w} ds={ds} rows={rows} onDrill={drill} readOnly={readOnly}
            onEdit={() => onEdit?.(w)} onRemove={() => setDash(d => ({ ...d, widgets: d.widgets.filter(x => x.id !== w.id) }))} />
        ))}
        {!readOnly && onEdit && (
          <button onClick={() => onEdit("new")} className="border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-2xl p-6 text-white/45 hover:text-white flex flex-col items-center justify-center gap-2 min-h-[120px]">
            <Icon name="Plus" size={22} />Добавить график
          </button>
        )}
      </div>
    </>
  );
}
