import { useEffect, useState } from "react";
import { mPost, type Ad } from "./api";
import { HOUSE_ADS, houseUrl } from "./houseAds";

export default function AdSlot({ ad, variant = "side", house = 0 }: { ad?: Ad; variant?: "side" | "wide"; house?: number }) {
  if (!ad) return <HouseAdCard n={house} variant={variant} />;
  const click = () => { mPost({ action: "click", id: ad.id }); };
  return (
    <a href={ad.link || "#"} target="_blank" rel="noopener sponsored" onClick={click}
      className={`block bg-white border border-[#e2d9cb] rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${variant === "wide" ? "md:flex" : ""}`}>
      {ad.image_url && <img src={ad.image_url} alt={ad.title} className={`object-cover ${variant === "wide" ? "md:w-72 h-40 md:h-auto w-full" : "w-full h-36"}`} />}
      <div className="p-4 flex-1">
        <div className="text-[10px] tracking-[0.18em] uppercase text-[#8a8278]">Реклама · {ad.advertiser}</div>
        <div className="font-bold mt-1.5 leading-snug">{ad.title}</div>
        {ad.text && <p className="text-sm text-[#5b5550] mt-1.5 leading-relaxed">{ad.text}</p>}
        <span className="inline-block mt-3 text-xs font-bold bg-[#14110f] text-white px-3 py-1.5 rounded">{ad.cta || "Подробнее"}</span>
      </div>
    </a>
  );
}

export function pickAd(ads: Ad[], slot: Ad["slot"], n = 0) {
  const list = ads.filter((a) => a.slot === slot);
  return list.length ? list[n % list.length] : undefined;
}

function HouseAdCard({ n, variant }: { n: number; variant: "side" | "wide" }) {
  const [shift, setShift] = useState(0);
  useEffect(() => { setShift(Math.floor(Date.now() / 86400000)); }, []);
  const a = HOUSE_ADS[(n + shift) % HOUSE_ADS.length];
  const wide = variant === "wide";
  const grad = { backgroundImage: `linear-gradient(90deg, ${a.from}, ${a.to})` };
  return (
    <a href={houseUrl(a, `site-${variant}`)} target="_blank" rel="noopener"
      className={`group block relative overflow-hidden rounded-lg bg-[#0b0a14] text-white font-['Golos_Text',sans-serif] ${wide ? "md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""}`}
      style={{ boxShadow: `0 0 0 1px ${a.from}, 0 10px 30px -12px ${a.from}` }}>
      <div className={`relative overflow-hidden ${wide ? "h-44 md:h-full md:min-h-[200px]" : "h-40"}`}>
        <img src={a.image} alt={a.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0a14]/70 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/55 backdrop-blur px-3 py-1 text-xs font-black tracking-wide" style={{ boxShadow: `0 0 0 1px ${a.from}` }}>
          <span className="w-2 h-2 rounded-full" style={grad} />{a.brand}
        </span>
      </div>
      <div className={`relative p-5 ${wide ? "md:p-7 flex flex-col justify-center" : ""}`} style={{ backgroundImage: `radial-gradient(circle at 100% 0%, ${a.from}33, transparent 60%)` }}>
        <div className="text-[10px] tracking-[0.18em] uppercase text-white/50">Реклама · {a.brand}</div>
        <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase mt-2" style={{ color: a.to }}>{a.kicker}</div>
        <div className={`font-black leading-tight mt-1.5 ${wide ? "text-2xl md:text-3xl" : "text-lg"}`}>{a.title}</div>
        <p className={`text-white/75 mt-2 leading-relaxed ${wide ? "text-sm md:text-base" : "text-sm"}`}>{a.text}</p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <span className="inline-block text-sm font-bold text-white px-4 py-2 rounded-full" style={grad}>{a.cta}</span>
          <span className="text-sm font-bold text-white/80">{a.domain}</span>
        </div>
      </div>
    </a>
  );
}
