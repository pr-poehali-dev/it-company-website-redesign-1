import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { SearchItem, bizGet, money, prettyName } from "./bizApi";

export default function CompanySearch({ onPick, big = false, placeholder = "Название компании или ИНН — отчёт и проверка" }: { onPick: (inn: string) => void; big?: boolean; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 3) { setItems([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await bizGet<{ items: SearchItem[] }>({ action: "search", q: v }).catch(() => ({ items: [] }));
      setItems(r.items || []);
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = q.replace(/\D/g, "");
    if (d.length === 10 || d.length === 12) onPick(d);
    else if (items[0]) onPick(items[0].inn);
  };

  return (
    <div ref={box} className="relative">
      <form onSubmit={submit} className="relative">
        <Icon name={loading ? "Loader2" : "Search"} size={big ? 20 : 16} className={`absolute left-4 top-1/2 -translate-y-1/2 text-white/40 ${loading ? "animate-spin" : ""}`} />
        <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => items.length && setOpen(true)} placeholder={placeholder}
          className={`w-full bg-white/[0.06] border border-white/15 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-violet-500/70 ${big ? "pl-12 pr-32 py-4 text-base" : "pl-11 pr-28 py-3 text-sm"}`} />
        <button type="submit" className={`absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-white font-semibold ${big ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs"}`}>Проверить</button>
      </form>
      {open && items.length > 0 && (
        <div className="absolute z-30 mt-2 w-full bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {items.map(it => (
            <button key={it.inn} onClick={() => { setOpen(false); onPick(it.inn); }}
              className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0">
              <div className="text-sm text-white font-medium truncate">{prettyName(it.name)}</div>
              <div className="text-xs text-white/45 mt-0.5 flex gap-3 flex-wrap">
                <span>ИНН {it.inn}</span>
                {it.region_name && <span>{it.region_name}</span>}
                {it.revenue ? <span className="text-cyan-300/80">выручка {money(it.revenue)}</span> : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
