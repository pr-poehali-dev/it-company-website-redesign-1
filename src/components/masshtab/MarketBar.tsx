import type { Cbr } from "./api";

function Cell({ label, v, prev, unit = "₽" }: { label: string; v?: number; prev?: number; unit?: string }) {
  if (v == null) return null;
  const raw = prev ? v - prev : 0;
  const d = Math.abs(raw) < 0.005 ? 0 : raw;
  return (
    <span className="whitespace-nowrap">
      {label} <b className="text-white">{v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{unit}</b>
      {d ? <span className={d > 0 ? "text-[#ff8a78]" : "text-[#7ee0a0]"}> {d > 0 ? "▲" : "▼"}{Math.abs(d).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : null}
    </span>
  );
}

export default function MarketBar({ cbr }: { cbr: Cbr | null }) {
  if (!cbr || (!cbr.USD && !cbr.key_rate)) return null;
  return (
    <div className="bg-[#14110f] text-white/70 text-xs">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-2 flex items-center gap-5 overflow-x-auto">
        {cbr.key_rate != null && <span className="whitespace-nowrap">Ключевая ставка <b className="text-white">{cbr.key_rate.toLocaleString("ru-RU")}%</b></span>}
        <Cell label="USD" v={cbr.USD} prev={cbr.prev?.USD} />
        <Cell label="EUR" v={cbr.EUR} prev={cbr.prev?.EUR} />
        <Cell label="CNY" v={cbr.CNY} prev={cbr.prev?.CNY} />
        <span className="ml-auto whitespace-nowrap text-white/40">Банк России{cbr.rates_date ? `, курсы на ${cbr.rates_date}` : ""}</span>
      </div>
    </div>
  );
}
