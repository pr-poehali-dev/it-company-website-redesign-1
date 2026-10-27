import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { DbFilters, Overview, bizGet } from "./bizApi";

interface Props {
  value: DbFilters;
  onApply: (f: DbFilters) => void;
  lockedKeys?: (keyof DbFilters)[];
}

interface Opt { code: string; name: string }

let cache: { okved: Opt[]; regions: Opt[] } | null = null;

const REV = [["", "любая"], ["1000000", "1 млн"], ["10000000", "10 млн"], ["120000000", "120 млн"], ["800000000", "800 млн"], ["2000000000", "2 млрд"], ["10000000000", "10 млрд"]];
const STAFF = [["", "любой"], ["5", "5"], ["15", "15"], ["50", "50"], ["100", "100"], ["250", "250"], ["1000", "1000"]];
const sel = "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 [&>option]:bg-[#12121f]";

function Multi({ label, options, value, onChange, placeholder }: { label: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const shown = options.filter(o => !value.includes(o.code) && (!q || `${o.code} ${o.name}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 60);
  return (
    <div>
      <div className="text-xs text-white/50 mb-1.5">{label}</div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {value.map(v => (
            <button key={v} onClick={() => onChange(value.filter(x => x !== v))} className="text-xs px-2 py-1 rounded-lg bg-violet-600/30 border border-violet-500/40 text-white flex items-center gap-1 max-w-full">
              <span className="truncate">{v} {options.find(o => o.code === v)?.name.slice(0, 26)}</span><Icon name="X" size={11} />
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60" />
        {open && shown.length > 0 && (
          <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-[#12121f] border border-white/10 rounded-xl shadow-2xl">
            {shown.map(o => (
              <button key={o.code} onMouseDown={e => e.preventDefault()} onClick={() => { onChange([...value, o.code]); setQ(""); }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm flex gap-2">
                <span className="text-cyan-300 w-10 shrink-0">{o.code}</span><span className="text-white/80">{o.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DbFilterPanel({ value, onApply, lockedKeys = [] }: Props) {
  const [f, setF] = useState<DbFilters>(value);
  const [opts, setOpts] = useState(cache);
  useEffect(() => setF(value), [value]);

  useEffect(() => {
    if (cache) return;
    Promise.all([bizGet<{ items: { code: string; name: string }[] }>({ action: "okved" }), bizGet<Overview>({ action: "overview" })]).then(([o, ov]) => {
      cache = {
        okved: (o.items || []).map(x => ({ code: x.code, name: x.name })),
        regions: (ov.regions || []).map(r => ({ code: r.region, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, "ru")),
      };
      setOpts(cache);
    });
  }, []);

  const set = <K extends keyof DbFilters>(k: K, v: DbFilters[K]) => setF(p => {
    const n = { ...p, [k]: v };
    if (v === undefined || v === false || (Array.isArray(v) && !v.length)) delete n[k];
    return n;
  });
  const isLocked = (k: keyof DbFilters) => lockedKeys.includes(k);
  const numOrU = (s: string) => (s ? Number(s) : undefined);
  const toggleList = (k: "msp_cat" | "tax_mode", v: string) => {
    const cur = f[k] || [];
    set(k, cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]);
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-4">
      <div className="font-semibold text-white flex items-center gap-2"><Icon name="SlidersHorizontal" size={16} className="text-violet-300" />Фильтры</div>
      {!isLocked("okved2") && (
        <Multi label="Отрасли (ОКВЭД, 2 знака)" options={opts?.okved || []} value={f.okved2 || []} onChange={v => set("okved2", v)} placeholder="Например: 41 или «строительство»" />
      )}
      <div>
        <div className="text-xs text-white/50 mb-1.5">Точный вид деятельности</div>
        <input value={(f.okved || []).join(", ")} onChange={e => set("okved", e.target.value.split(/[,\s]+/).filter(x => /^\d{2}(\.\d{1,2}){0,2}$/.test(x)))}
          placeholder="Коды через запятую: 62.01, 10.51" className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60" />
      </div>
      {!isLocked("region") && (
        <Multi label="Регионы" options={opts?.regions || []} value={f.region || []} onChange={v => set("region", v)} placeholder="Начните вводить регион" />
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/50">Выручка от
          <select value={String(f.min_revenue || "")} onChange={e => set("min_revenue", numOrU(e.target.value))} className={`${sel} mt-1`}>{REV.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">Выручка до
          <select value={String(f.max_revenue || "")} onChange={e => set("max_revenue", numOrU(e.target.value))} className={`${sel} mt-1`}>{REV.map(([v, l]) => <option key={v} value={v}>{v ? l : "без ограничения"}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">Штат от
          <select value={String(f.min_staff || "")} onChange={e => set("min_staff", numOrU(e.target.value))} className={`${sel} mt-1`}>{STAFF.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="text-xs text-white/50">Штат до
          <select value={String(f.max_staff || "")} onChange={e => set("max_staff", numOrU(e.target.value))} className={`${sel} mt-1`}>{STAFF.map(([v, l]) => <option key={v} value={v}>{v ? l : "без ограничения"}</option>)}</select>
        </label>
      </div>
      <div>
        <div className="text-xs text-white/50 mb-1.5">Размер по реестру МСП</div>
        <div className="flex flex-wrap gap-1.5">
          {[["1", "Микро"], ["2", "Малые"], ["3", "Средние"], ["0", "Крупные"]].map(([v, l]) => (
            <button key={v} onClick={() => toggleList("msp_cat", v)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${(f.msp_cat || []).includes(v) ? "bg-violet-600/40 border-violet-500/60 text-white" : "border-white/10 text-white/55"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-white/50 mb-1.5">Налоговый режим</div>
        <div className="flex flex-wrap gap-1.5">
          {["ОСН", "УСН", "АУСН", "ЕСХН"].map(v => (
            <button key={v} onClick={() => toggleList("tax_mode", v)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${(f.tax_mode || []).includes(v) ? "bg-violet-600/40 border-violet-500/60 text-white" : "border-white/10 text-white/55"}`}>{v}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {([
          ["profitable", "Доходы выше расходов"], ["no_debt", "Без налоговой недоимки"], ["grants", "Получали господдержку"],
          ["has_contacts", "Есть телефон или почта"],
        ] as [keyof DbFilters, string][]).map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input type="checkbox" checked={!!f[k]} onChange={e => set(k, e.target.checked as never)} className="accent-violet-500" disabled={isLocked(k)} />{l}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={(f.msp_year_from || 0) >= 2024} onChange={e => set("msp_year_from", e.target.checked ? 2024 : undefined)} className="accent-violet-500" />Новые: в реестре МСП с 2024 года
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onApply(f)} className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2.5 rounded-xl text-sm font-semibold text-white">Показать</button>
        <button onClick={() => { const keep: DbFilters = {}; lockedKeys.forEach(k => { if (value[k] !== undefined) (keep as Record<string, unknown>)[k] = value[k]; }); setF(keep); onApply(keep); }}
          className="px-3 py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white">Сбросить</button>
      </div>
    </div>
  );
}