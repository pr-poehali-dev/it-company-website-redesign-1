import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { AGG_LABEL, Dataset, Row, Widget, aggregate, fmt } from "./biEngine";

const COLORS = ["#7c3aed", "#0891b2", "#a78bfa", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#64748b", "#c084fc", "#38bdf8", "#fbbf24", "#475569"];
const TT = { background: "#10101c", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12 };
const AX = { fill: "rgba(255,255,255,.45)", fontSize: 10 };

interface Props {
  w: Widget;
  ds: Dataset;
  rows: Row[];
  onEdit: () => void;
  onRemove: () => void;
  onDrill?: (column: string, value: string) => void;
}

export default function BiWidget({ w, ds, rows, onEdit, onRemove, onDrill }: Props) {
  const data = useMemo(() => aggregate(rows, w, ds), [rows, w, ds]);
  const wide = w.type !== "kpi" && w.type !== "pie";
  const click = (label?: string) => { if (onDrill && w.dim && label && !label.startsWith("Прочие")) onDrill(w.dim, label); };

  return (
    <div className={`bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col group ${w.type === "kpi" ? "" : "min-h-[300px]"} ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{w.title}</div>
          {w.type !== "kpi" && <div className="text-[11px] text-white/40">{AGG_LABEL[w.agg]}{w.measure ? ` · ${w.measure}` : ""}</div>}
        </div>
        <div className="flex gap-1 opacity-60 group-hover:opacity-100 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60" title="Настроить"><Icon name="Settings2" size={14} /></button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-rose-300" title="Удалить"><Icon name="X" size={14} /></button>
        </div>
      </div>
      {typeof data === "number" ? (
        <div className="font-['Oswald',sans-serif] text-3xl font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">{fmt(data)}</div>
      ) : !data.length ? (
        <div className="flex-1 flex items-center justify-center text-sm text-white/40">Нет данных</div>
      ) : w.type === "table" ? (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-sm">
            <tbody>
              {data.map(d => (
                <tr key={d.label} className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer" onClick={() => click(d.label)}>
                  <td className="py-1.5 pr-3 text-white/75">{d.label}</td><td className="py-1.5 text-right text-white">{fmt(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 min-h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            {w.type === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius="45%" outerRadius="85%" paddingAngle={2} stroke="none" onClick={(e: { label?: string }) => click(e?.label)}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer" />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} />
              </PieChart>
            ) : w.type === "hbar" ? (
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" tick={AX} tickFormatter={fmt} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={AX} width={130} axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + "…" : v)} />
                <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} labelStyle={{ color: "#fff" }} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(e: { label?: string }) => click(e?.label)} className="cursor-pointer">
                  {data.map((_, i) => <Cell key={i} fill={i === 0 ? "#7c3aed" : "#6d28d9aa"} />)}
                </Bar>
              </BarChart>
            ) : w.type === "line" ? (
              <LineChart data={data} margin={{ right: 12 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="label" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} tickFormatter={fmt} axisLine={false} tickLine={false} width={56} />
                <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} labelStyle={{ color: "#fff" }} />
                <Line dataKey="value" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
              </LineChart>
            ) : w.type === "area" ? (
              <AreaChart data={data} margin={{ right: 12 }}>
                <defs><linearGradient id={`g${w.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.6} /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="label" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} tickFormatter={fmt} axisLine={false} tickLine={false} width={56} />
                <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} labelStyle={{ color: "#fff" }} />
                <Area dataKey="value" stroke="#a78bfa" strokeWidth={2} fill={`url(#g${w.id})`} />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="label" tick={AX} axisLine={false} tickLine={false} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 60 : 24} tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + "…" : v)} />
                <YAxis tick={AX} tickFormatter={fmt} axisLine={false} tickLine={false} width={56} />
                <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} labelStyle={{ color: "#fff" }} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} onClick={(e: { label?: string }) => click(e?.label)} className="cursor-pointer">
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {w.type === "pie" && Array.isArray(data) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {data.slice(0, 8).map((d, i) => <span key={d.label} className="text-[11px] text-white/60 flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />{d.label}</span>)}
        </div>
      )}
    </div>
  );
}
