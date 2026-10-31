import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { Logo } from "../MShell";
import Crumbs from "../Crumbs";
import type { RatingResp } from "../api";
import { H, W } from "./Frame";
import { SlideAbout, SlideCover, SlideNumbers, SlideReaders, SlideSegments } from "./SlidesIntro";
import { SlideFormats, SlidePackages, SlidePartner, SlideSpecials, SlideStart } from "./SlidesOffer";

function Slides({ rating, wrap }: { rating: RatingResp | null; wrap?: (n: ReactNode, i: number) => ReactNode }) {
  const list = [
    <SlideCover key="1" />, <SlideAbout key="2" />, <SlideNumbers key="3" rating={rating} />, <SlideReaders key="4" />, <SlideSegments key="5" />,
    <SlideFormats key="6" />, <SlidePartner key="7" />, <SlideSpecials key="8" />, <SlidePackages key="9" />, <SlideStart key="10" />,
  ];
  return <>{wrap ? list.map((s, i) => wrap(s, i)) : list}</>;
}

export default function MediaKitPage({ rating }: { rating: RatingResp | null }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!exporting) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ toJpeg }, { default: jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
        await document.fonts?.ready;
        const root = exportRef.current;
        if (!root || cancelled) throw new Error("no root");
        const doc = new jsPDF({ orientation: "l", unit: "px", format: [W, H], hotfixes: ["px_scaling"] });
        const slides = Array.from(root.querySelectorAll<HTMLElement>(".mk-slide"));
        for (let i = 0; i < slides.length; i++) {
          setProgress(i + 1);
          const opts = { width: W, height: H, pixelRatio: 2, quality: 0.92, backgroundColor: "#f6f2ea", cacheBust: false };
          await toJpeg(slides[i], opts);
          const data = await toJpeg(slides[i], opts);
          if (i > 0) doc.addPage([W, H], "l");
          doc.addImage(data, "JPEG", 0, 0, W, H);
        }
        doc.save("Масштаб — медиакит.pdf");
      } catch {
        window.print();
      } finally {
        if (!cancelled) {
          setExporting(false);
          setProgress(0);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [exporting]);

  const s = scale ?? 1;

  return (
    <div className="min-h-screen bg-[#e9e2d6] text-[#14110f] font-['Golos_Text',sans-serif]">
      <header className="sticky top-0 z-30 bg-[#f6f2ea]/95 backdrop-blur border-b-2 border-[#14110f]">
        <div className="max-w-[1320px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/masshtab"><Logo className="text-2xl md:text-3xl" /></Link>
            <span className="hidden sm:inline text-sm font-bold text-[#5b5550] border-l border-[#e2d9cb] pl-4">Медиакит 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/masshtab/reklama" className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded border-2 border-[#14110f] text-sm font-bold hover:bg-[#14110f] hover:text-white transition-colors">
              <Icon name="MessageSquare" size={16} />Обсудить размещение
            </Link>
            <Link to="/masshtab/reklama" className="inline-flex items-center gap-2 h-10 px-4 rounded border-2 border-[#14110f] text-sm font-bold hover:bg-[#14110f] hover:text-white transition-colors">
              <Icon name="Send" size={16} /><span className="hidden sm:inline">Оставить заявку</span>
            </Link>
            <button onClick={() => setExporting(true)} disabled={exporting}
              className="inline-flex items-center gap-2 h-10 px-4 rounded bg-[#d6402b] text-white text-sm font-bold hover:bg-[#b93522] transition-colors disabled:opacity-70">
              <Icon name={exporting ? "Loader2" : "Download"} size={16} className={exporting ? "animate-spin" : ""} />
              {exporting ? `PDF: ${progress}/10` : "Скачать PDF"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1320px] mx-auto px-4 md:px-6 py-6">
        <Crumbs items={[{ label: "Реклама и сотрудничество", to: "/masshtab/reklama" }, { label: "Медиакит 2026" }]} />
        <h1 className="sr-only">Медиакит журнала «Масштаб» 2026: аудитория, форматы и цены рекламы</h1>
        <div ref={boxRef} className="flex flex-col gap-6 mt-5">
          <Slides rating={rating} wrap={(node, i) => (
            <div key={i} className="overflow-hidden rounded-lg shadow-[0_8px_30px_rgba(20,17,15,0.12)] mx-auto"
              style={scale === null ? { width: "100%", maxWidth: W, height: H } : { width: W * s, height: H * s }}>
              <div style={{ width: W, height: H, transform: `scale(${s})`, transformOrigin: "top left" }}>{node}</div>
            </div>
          )} />
        </div>
      </main>

      {exporting && (
        <div ref={exportRef} aria-hidden style={{ position: "fixed", left: -10000, top: 0, width: W, pointerEvents: "none" }}>
          <Slides rating={rating} />
        </div>
      )}
    </div>
  );
}
