import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Overview, bizGet, money } from "@/components/biz/bizApi";
import { Dataset, Row, fmt } from "./biEngine";

interface Bench {
  okved_name: string;
  region_name: string;
  n: number;
  revenue: { pct: number; q: number[] };
  margin: { pct: number | null; q: number[] };
  productivity: { pct: number | null; q: number[] };
  error?: string;
}

const sel = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 [&>option]:bg-[#12121f]";

function Scale({ label, pct, value, q, unit }: { label: string; pct: number | null; value: string; q: number[]; unit: (v: number) => string }) {
  if (pct == null) return null;
  const tone = pct >= 75 ? "text-emerald-300" : pct >= 40 ? "text-cyan-300" : "text-amber-300";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5"><span className="text-white/70">{label}: <b className="text-white">{value}</b></span><span className={tone}>выше, чем у {pct.toLocaleString("ru-RU")}%</span></div>
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-amber-500/40 via-cyan-500/40 to-emerald-500/50">
        <div className="absolute -top-1 w-1.5 h-4.5 h-[18px] rounded bg-white shadow" style={{ left: `calc(${Math.min(99, Math.max(1, pct))}% - 3px)` }} />
      </div>
      <div className="flex justify-between text-[10px] text-white/35 mt-1"><span>25%: {unit(q[0])}</span><span>медиана: {unit(q[1])}</span><span>75%: {unit(q[2])}</span></div>
    </div>
  );
}

export default function MarketBenchmark({ ds, rows }: { ds: Dataset; rows: Row[] }) {
  const nums = ds.columns.filter(c => c.type === "number");
  const guess = (re: RegExp) => nums.find(c => re.test(c.name))?.name || "";
  const [revCol, setRevCol] = useState(() => guess(/выручк|сумм|оборот|продаж|revenue|amount/i) || nums[0]?.name || "");
  const [marginCol, setMarginCol] = useState(() => guess(/марж|прибыл|profit|margin/i));
  const [staff, setStaff] = useState("");
  const [months, setMonths] = useState("12");
  const [okved, setOkved] = useState("62");
  const [region, setRegion] = useState("");
  const [opts, setOpts] = useState<{ okved: { code: string; name: string }[]; regions: { code: string; name: string }[] } | null>(null);
  const [res, setRes] = useState<Bench | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([bizGet<{ items: { code: string; name: string }[] }>({ action: "okved" }), bizGet<Overview>({ action: "overview" })]).then(([o, ov]) => setOpts({
      okved: (o.items || []).map(x => ({ code: x.code, name: x.name })),
      regions: (ov.regions || []).map(r => ({ code: r.region, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, "ru")),
    }));
  }, []);

  const totals = useMemo(() => {
    const sum = (c: string) => rows.reduce((a, r) => a + (typeof r[c] === "number" ? (r[c] as number) : 0), 0);
    const rev = revCol ? sum(revCol) : 0;
    const k = 12 / Math.max(1, Number(months) || 12);
    const annual = rev * k;
    const marg = marginCol ? sum(marginCol) : null;
    return { rev, annual, margin: marg != null && rev ? (marg / rev) * 100 : null };
  }, [rows, revCol, marginCol, months]);

  async function run() {
    if (!totals.annual) return;
    setLoading(true);
    const r = await bizGet<Bench>({ action: "benchmark", okved, region, revenue: String(Math.round(totals.annual)), staff, margin: totals.margin != null ? totals.margin.toFixed(2) : "" });
    setRes(r);
    setLoading(false);
  }

  return (
    <div className="bg-gradient-to-br from-violet-600/15 to-cyan-600/5 border border-violet-500/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1"><Icon name="Scale" size={18} className="text-violet-300" /><div className="font-semibold text-white">Сравнение с рынком</div><span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200">данные ФНС</span></div>
      <p className="text-xs text-white/50 mb-4">Сопоставим ваши показатели с компаниями той же отрасли и региона за 2025 год. Расчёт идёт по отфильтрованным строкам.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <label className="text-xs text-white/50">Колонка выручки
          <select value={revCol} onChange={e => setRevCol(e.target.value)} className={`${sel} mt-1`}>{nums.map(c => <option key={c.name}>{c.name}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">Колонка прибыли / маржи
          <select value={marginCol} onChange={e => setMarginCol(e.target.value)} className={`${sel} mt-1`}><option value="">— нет —</option>{nums.map(c => <option key={c.name}>{c.name}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">За сколько месяцев данные
          <select value={months} onChange={e => setMonths(e.target.value)} className={`${sel} mt-1`}>{["1", "3", "6", "12", "18", "24"].map(m => <option key={m} value={m}>{m}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">Отрасль
          <select value={okved} onChange={e => setOkved(e.target.value)} className={`${sel} mt-1`}>{(opts?.okved || [{ code: "62", name: "ИТ" }]).map(o => <option key={o.code} value={o.code}>{o.code} {o.name.slice(0, 50)}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">Регион
          <select value={region} onChange={e => setRegion(e.target.value)} className={`${sel} mt-1`}><option value="">Вся Россия</option>{opts?.regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">Сотрудников (необязательно)
          <input value={staff} onChange={e => setStaff(e.target.value.replace(/\D/g, ""))} placeholder="например, 25" className={`${sel} mt-1 placeholder-white/30`} />
        </label>
      </div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="text-sm text-white/70">Годовая выручка: <b className="text-white">{money(totals.annual)}</b>{totals.margin != null && <> · рентабельность <b className="text-white">{totals.margin.toFixed(1).replace(".", ",")}%</b></>}</div>
        <button onClick={run} disabled={!totals.annual || loading} className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2">
          <Icon name={loading ? "Loader2" : "Play"} size={14} className={loading ? "animate-spin" : ""} />Сравнить
        </button>
      </div>
      {res?.error && <p className="text-sm text-rose-300">{res.error}</p>}
      {res && !res.error && (
        <div className="space-y-4 bg-black/20 rounded-xl p-4">
          <div className="text-xs text-white/50">Среди {res.n.toLocaleString("ru-RU")} компаний: {res.okved_name.slice(0, 70)} · {res.region_name}</div>
          <Scale label="Выручка" pct={res.revenue.pct} value={money(totals.annual)} q={res.revenue.q} unit={v => money(v)} />
          <Scale label="Рентабельность" pct={res.margin.pct} value={`${totals.margin?.toFixed(1).replace(".", ",")}%`} q={res.margin.q} unit={v => `${(v * 100).toFixed(1).replace(".", ",")}%`} />
          <Scale label="Выручка на сотрудника" pct={res.productivity.pct} value={staff ? money(totals.annual / Number(staff)) : ""} q={res.productivity.q} unit={v => fmt(v)} />
        </div>
      )}
    </div>
  );
}
