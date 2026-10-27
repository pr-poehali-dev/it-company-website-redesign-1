import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "@/lib/helmet";
import Icon from "@/components/ui/icon";
import { SLIDES } from "@/components/presentation/Slides";

const W = 1280;
const H = 720;

export default function Presentation() {
  const stageRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [cur, setCur] = useState(0);
  const [mode, setMode] = useState<"deck" | "scroll">("deck");
  const [pdf, setPdf] = useState<"" | number>("");
  const total = SLIDES.length;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("view") === "scroll") setMode("scroll");
    const s = Number(q.get("slide"));
    if (s >= 1 && s <= total) setCur(s - 1);
  }, [total]);

  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = mode === "deck" ? el.clientHeight : Infinity;
    setScale(Math.min(w / W, h / H));
  }, [mode]);

  useEffect(() => {
    fit();
    const el = stageRef.current;
    const ro = el ? new ResizeObserver(fit) : null;
    if (el && ro) ro.observe(el);
    document.addEventListener("fullscreenchange", fit);
    return () => { ro?.disconnect(); document.removeEventListener("fullscreenchange", fit); };
  }, [fit]);

  const go = useCallback((d: number) => setCur(c => Math.max(0, Math.min(total - 1, c + d))), [total]);

  useEffect(() => {
    if (mode !== "deck") return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); go(1); }
      if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); go(-1); }
      if (e.key === "Home") setCur(0);
      if (e.key === "End") setCur(total - 1);
      if (e.key === "f" || e.key === "а") fullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, mode, total]);

  const touch = useRef(0);

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  async function downloadPdf() {
    const root = exportRef.current;
    if (!root || pdf !== "") return;
    setPdf(0);
    const [{ toJpeg }, { default: jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
    await document.fonts?.ready;
    await Promise.all(Array.from(root.querySelectorAll("img")).map(img => (img.complete ? null : new Promise(r => { img.onload = img.onerror = r; }))));
    try {
      const doc = new jsPDF({ orientation: "l", unit: "px", format: [W, H], hotfixes: ["px_scaling"] });
      const slides = Array.from(root.querySelectorAll<HTMLElement>(".deck-slide"));
      for (let i = 0; i < slides.length; i++) {
        setPdf(i + 1);
        const opts = { width: W, height: H, pixelRatio: 2, quality: 0.92, backgroundColor: "#07070f", cacheBust: false };
        await toJpeg(slides[i], opts);
        const data = await toJpeg(slides[i], opts);
        if (i > 0) doc.addPage([W, H], "l");
        doc.addImage(data, "JPEG", 0, 0, W, H);
      }
      doc.save("МАТ-Лабс — презентация.pdf");
    } catch {
      window.print();
    } finally {
      setPdf("");
    }
  }

  const Btn = ({ onClick, icon, label, primary, disabled }: { onClick: () => void; icon: string; label?: string; primary?: boolean; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`h-10 px-3.5 rounded-xl flex items-center gap-2 text-sm font-medium transition disabled:opacity-40 ${primary ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:brightness-110" : "bg-white/10 text-white/85 hover:bg-white/15 border border-white/10"}`}>
      <Icon name={icon} size={16} />{label && <span className="hidden md:inline">{label}</span>}
    </button>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-[#030308] text-white overflow-hidden print:h-auto print:overflow-visible">
      <Helmet>
        <title>Презентация МАТ-Лабс: AI, автоматизация и аналитика для бизнеса</title>
        <meta name="description" content="AI-автоматизация, аналитика, сайты и приложения для бизнеса: направления, пакеты, процесс работы и кейсы МАТ-Лабс." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <style>{`
        .deck-grid{background-image:linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%)}
        @keyframes deckIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
        .deck-in{animation:deckIn .45s cubic-bezier(.2,.7,.2,1)}
        @page{size:1280px 720px;margin:0}
        @media print{.no-print{display:none!important}.print-stack{display:block!important}.print-stack .deck-slide{break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}.screen-only{display:none!important}}
      `}</style>

      <header className="no-print shrink-0 h-14 px-4 flex items-center gap-2 border-b border-white/10 bg-[#07070f]/90 backdrop-blur z-20">
        <a href="/" className="flex items-center gap-2 mr-2 text-sm text-white/60 hover:text-white"><Icon name="ArrowLeft" size={16} /><span className="hidden sm:inline">На сайт</span></a>
        <div className="font-['Oswald',sans-serif] font-semibold tracking-wide hidden sm:block">Презентация МАТ-Лабс</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex rounded-xl bg-white/5 border border-white/10 p-0.5 mr-1">
            {([["deck", "Слайды", "Presentation"], ["scroll", "Лентой", "Rows3"]] as const).map(([m, l, i]) => (
              <button key={m} onClick={() => setMode(m)} className={`h-9 px-3 rounded-[10px] text-sm flex items-center gap-1.5 ${mode === m ? "bg-white/15 text-white" : "text-white/55"}`}><Icon name={i} size={15} />{l}</button>
            ))}
          </div>
          {mode === "deck" && <Btn onClick={fullscreen} icon="Maximize" label="На весь экран" />}
          <Btn onClick={downloadPdf} icon={pdf !== "" ? "Loader2" : "Download"} label={pdf !== "" ? `PDF ${pdf}/${total}` : "Скачать PDF"} primary disabled={pdf !== ""} />
        </div>
      </header>

      {mode === "deck" ? (
        <div className="screen-only flex-1 min-h-0 flex flex-col">
          <div ref={stageRef} className="flex-1 min-h-0 relative flex items-center justify-center p-3 md:p-6"
            onTouchStart={e => { touch.current = e.touches[0].clientX; }}
            onTouchEnd={e => { const d = e.changedTouches[0].clientX - touch.current; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); }}>
            <div style={{ width: W * scale, height: H * scale }} className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-[0_30px_120px_-20px_rgba(124,58,237,.45)] ring-1 ring-white/10">
              <div key={cur} className="deck-in w-full h-full">
                <div className="origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
                  {(() => { const S = SLIDES[cur]; return <S n={cur + 1} total={total} />; })()}
                </div>
              </div>
            </div>
            <button onClick={() => go(-1)} disabled={cur === 0} aria-label="Назад" className="no-print absolute left-2 md:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 border border-white/15 backdrop-blur flex items-center justify-center disabled:opacity-0 hover:bg-black/60"><Icon name="ChevronLeft" size={22} /></button>
            <button onClick={() => go(1)} disabled={cur === total - 1} aria-label="Вперёд" className="no-print absolute right-2 md:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 border border-white/15 backdrop-blur flex items-center justify-center disabled:opacity-0 hover:bg-black/60"><Icon name="ChevronRight" size={22} /></button>
          </div>
          <div className="no-print shrink-0 h-12 flex items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setCur(i)} aria-label={`Слайд ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === cur ? "w-8 bg-gradient-to-r from-violet-400 to-cyan-300" : "w-3 bg-white/20 hover:bg-white/40"}`} />
            ))}
            <span className="ml-3 text-xs text-white/40 hidden sm:inline">← → листать · F — на весь экран</span>
          </div>
        </div>
      ) : (
        <div ref={stageRef} className="screen-only flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto p-3 md:p-6 space-y-5">
            {SLIDES.map((S, i) => (
              <div key={i} style={{ height: H * scale }} className="rounded-xl md:rounded-2xl overflow-hidden ring-1 ring-white/10">
                <div className="origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}><S n={i + 1} total={total} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={exportRef} aria-hidden className="print-stack fixed -left-[20000px] top-0 pointer-events-none">
        {SLIDES.map((S, i) => <S key={i} n={i + 1} total={total} />)}
      </div>
    </div>
  );
}