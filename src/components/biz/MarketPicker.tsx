import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { bizGet, Overview } from "./bizApi";

interface OkvedItem { code: string; name: string; section: string }

let regionsCache: { region: string; name: string }[] | null = null;

export default function MarketPicker({ okved, region, onChange }: { okved: string; region: string; onChange: (okved: string, region: string) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OkvedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState(regionsCache || []);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (regionsCache) return;
    bizGet<Overview>({ action: "overview" }).then(r => {
      regionsCache = [...(r.regions || [])].map(x => ({ region: x.region, name: x.name })).sort((a, b) => a.name.localeCompare(b.name, "ru"));
      setRegions(regionsCache);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      bizGet<{ items: OkvedItem[] }>({ action: "okved", q: q.trim() }).then(r => setItems(r.items || []));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="grid md:grid-cols-[1fr_260px] gap-2 mb-6">
      <div ref={box} className="relative">
        <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => setOpen(true)}
          placeholder={okved === "ALL" ? "Отрасль: название или код ОКВЭД, например «молоко» или 10.51" : `ОКВЭД ${okved} — найти другую отрасль`}
          className="w-full bg-white/[0.06] border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-violet-500/70" />
        {open && items.length > 0 && (
          <div className="absolute z-30 mt-2 w-full max-h-80 overflow-y-auto bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl">
            {okved !== "ALL" && (
              <button onClick={() => { setOpen(false); setQ(""); onChange("ALL", region); }} className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm text-violet-300 border-b border-white/5">Все отрасли</button>
            )}
            {items.map(it => (
              <button key={it.code} onClick={() => { setOpen(false); setQ(""); onChange(it.code, region); }}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 border-b border-white/5 last:border-0 flex gap-3">
                <span className="text-cyan-300 text-sm w-14 shrink-0">{it.code}</span>
                <span className="text-sm text-white/85">{it.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <select value={region} onChange={e => onChange(okved, e.target.value)}
        className="bg-white/[0.06] border border-white/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/70 [&>option]:bg-[#12121f]">
        <option value="RU">Вся Россия</option>
        {regions.map(r => <option key={r.region} value={r.region}>{r.name}</option>)}
      </select>
    </div>
  );
}
