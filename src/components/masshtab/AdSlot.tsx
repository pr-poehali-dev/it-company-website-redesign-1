import { mPost, type Ad } from "./api";

export default function AdSlot({ ad, variant = "side" }: { ad?: Ad; variant?: "side" | "wide" }) {
  if (!ad) {
    return (
      <a href="/masshtab/reklama" className={`block border border-dashed border-[#cfc3b2] rounded-lg p-5 text-center hover:border-[#d6402b] transition-colors ${variant === "wide" ? "py-8" : ""}`}>
        <div className="text-[10px] tracking-[0.18em] uppercase text-[#8a8278]">Рекламное место</div>
        <div className="text-sm font-semibold mt-2">Здесь может быть ваша компания</div>
        <div className="text-xs text-[#d6402b] font-bold mt-2">Условия размещения →</div>
      </a>
    );
  }
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
