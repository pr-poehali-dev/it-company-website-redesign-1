import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "./MShell";
import Crumbs from "./Crumbs";
import IssueDeadline from "./IssueDeadline";
import { PRINT_NOTE, issuePage, issuePdf, issueThumb, type PrintIssue } from "./issues";

function spreadsOf(total: number): number[][] {
  const out: number[][] = [[1]];
  for (let p = 2; p < total; p += 2) out.push(p + 1 < total ? [p, p + 1] : [p]);
  if (total > 1) out.push([total]);
  return out;
}

export default function IssueReader({ issue, archive = false }: { issue: PrintIssue; archive?: boolean }) {
  const spreads = useMemo(() => spreadsOf(issue.pages), [issue.pages]);
  const [single, setSingle] = useState(false);
  const [page, setPage] = useState(1);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const upd = () => setSingle(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  const sIdx = spreads.findIndex((s) => s.includes(page));
  const shown = single ? [page] : spreads[Math.max(0, sIdx)];
  const atStart = shown[0] === 1;
  const atEnd = shown[shown.length - 1] === issue.pages;

  const go = useCallback((dir: 1 | -1) => {
    if (single) setPage((p) => Math.min(issue.pages, Math.max(1, p + dir)));
    else {
      const i = spreads.findIndex((s) => s.includes(page));
      const n = spreads[Math.min(spreads.length - 1, Math.max(0, i + dir))];
      setPage(n[0]);
    }
  }, [single, spreads, page, issue.pages]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);

  useEffect(() => {
    const next = single ? [page + 1] : spreads[Math.min(spreads.length - 1, sIdx + 1)];
    next.filter((n) => n <= issue.pages).forEach((n) => { const im = new Image(); im.src = issuePage(issue, n); });
  }, [page, single, spreads, sIdx, issue]);

  const [touchX, setTouchX] = useState<number | null>(null);
  const label = shown.length > 1 ? `Полосы ${shown[0]}–${shown[1]} из ${issue.pages}` : `Полоса ${shown[0]} из ${issue.pages}`;

  const book = (
    <div className={`relative ${full ? "h-full" : ""}`}>
      <div
        className={`flex justify-center items-center select-none ${full ? "h-[calc(100vh-120px)]" : ""}`}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => { if (touchX === null) return; const d = e.changedTouches[0].clientX - touchX; if (Math.abs(d) > 40) go(d < 0 ? 1 : -1); setTouchX(null); }}
      >
        <div className={`flex shadow-[0_20px_60px_-20px_rgba(20,17,15,0.55)] ${shown.length === 1 && !single ? (atStart ? "ml-[50%] -translate-x-1/2 md:translate-x-0 md:ml-0" : "") : ""}`}
          style={{ height: full ? "100%" : undefined }}>
          {shown.map((n, i) => (
            <div key={n} className="relative bg-white" style={{ aspectRatio: "210 / 280", height: full ? "100%" : undefined, width: full ? undefined : single ? "min(92vw, 560px)" : "min(43vw, 520px)" }}>
              <img src={issuePage(issue, n)} alt={`${issue.title}, полоса ${n}`} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              {shown.length > 1 && (
                <div className={`absolute inset-y-0 w-8 pointer-events-none ${i === 0 ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"} from-black/15 to-transparent`} />
              )}
            </div>
          ))}
        </div>
      </div>
      <button type="button" aria-label="Назад" disabled={atStart} onClick={() => go(-1)}
        className="absolute left-0 md:-left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#14110f] text-white flex items-center justify-center disabled:opacity-20 hover:bg-[#d6402b] transition-colors">
        <Icon name="ChevronLeft" size={22} />
      </button>
      <button type="button" aria-label="Вперёд" disabled={atEnd} onClick={() => go(1)}
        className="absolute right-0 md:-right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#14110f] text-white flex items-center justify-center disabled:opacity-20 hover:bg-[#d6402b] transition-colors">
        <Icon name="ChevronRight" size={22} />
      </button>
    </div>
  );

  const bar = (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-5 text-sm">
      <div className="font-semibold">{label}</div>
      <div className="flex items-center gap-2">
        <input type="range" min={1} max={issue.pages} value={page} onChange={(e) => setPage(Number(e.target.value))} className="w-40 md:w-64 accent-[#d6402b]" aria-label="Перейти к полосе" />
        <button type="button" onClick={() => setFull((v) => !v)} className="inline-flex items-center gap-1.5 border border-[#14110f] rounded px-3 py-1.5 font-semibold hover:bg-[#14110f] hover:text-[#f6f2ea]">
          <Icon name={full ? "Minimize2" : "Maximize2"} size={15} />{full ? "Свернуть" : "На весь экран"}
        </button>
      </div>
    </div>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-50 bg-[#2b2724] p-4 md:p-6 flex flex-col">
        <div className="flex justify-between items-center text-[#f6f2ea] mb-3">
          <div className={`${serif} font-bold text-xl`}>{issue.title}</div>
          <button type="button" onClick={() => setFull(false)} className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-[#e8836f]"><Icon name="X" size={18} />Закрыть</button>
        </div>
        <div className="flex-1 min-h-0">{book}</div>
        <div className="text-[#f6f2ea]">{bar}</div>
      </div>
    );
  }

  return (
    <MShell active="/masshtab/pechatnyy-nomer">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-4">
        <Crumbs items={archive ? [{ label: "Архив номеров", to: "/masshtab/arhiv" }, { label: issue.title }] : [{ label: "Печатный номер" }]} />
        <div className="flex flex-wrap items-end justify-between gap-6 mt-6">
          <div className="max-w-2xl">
            <Kicker>{archive ? "Архив номеров" : "Печатная версия · выходит ежемесячно"}</Kicker>
            <h1 className={`${serif} font-bold text-4xl md:text-5xl mt-2 leading-[1.05]`}>{issue.title}</h1>
            <p className="text-lg text-[#5b5550] mt-3">
              {issue.pages} полос, формат 210×280 мм. Листайте номер так, как он выглядит на бумаге, или скачайте PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={issuePdf(issue)} download className="inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold rounded px-4 py-2.5 hover:bg-[#b93522]">
              <Icon name="Download" size={18} />PDF для чтения · {String(issue.readMb).replace(".", ",")} МБ
            </a>
            <a href={issuePdf(issue, true)} download className="inline-flex items-center gap-2 border-2 border-[#14110f] font-bold rounded px-4 py-2 hover:bg-[#14110f] hover:text-[#f6f2ea]">
              <Icon name="Printer" size={18} />PDF для типографии
            </a>
          </div>
        </div>

        <div className="mt-10 bg-[#e9e2d6] rounded-lg px-3 md:px-10 py-8 md:py-12">
          {book}
          {bar}
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: issue.pages }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => setPage(n)} className={`shrink-0 text-center ${shown.includes(n) ? "opacity-100" : "opacity-60 hover:opacity-100"}`}>
              <img src={issueThumb(issue, n)} alt="" loading="lazy" className={`w-[60px] h-[80px] object-cover bg-white border-2 ${shown.includes(n) ? "border-[#d6402b]" : "border-transparent"}`} />
              <span className="text-[10px] text-[#8a8278]">{n}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-10 mt-12">
          <section>
            <h2 className={`${serif} font-bold text-3xl`}>Содержание номера</h2>
            <div className="mt-5 border-t-2 border-[#14110f]">
              {issue.toc.map((t) => (
                <button key={t.page} type="button" onClick={() => { setPage(t.page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="w-full text-left grid grid-cols-[56px_1fr] gap-4 py-3 border-b border-[#e2d9cb] group">
                  <span className={`${serif} font-bold text-2xl text-[#d6402b]`}>{t.page}</span>
                  <span>
                    <span className="block text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8a8278]">{t.rubric}</span>
                    <span className={`block ${serif} font-bold text-lg leading-snug group-hover:text-[#d6402b]`}>{t.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <aside className="space-y-5">
            <IssueDeadline compact />
            <div className="bg-white border border-[#e2d9cb] rounded-lg p-5">
              <Kicker>Для типографии</Kicker>
              <p className="mt-2 text-sm text-[#5b5550]">{PRINT_NOTE} Файл уже подготовлен по требованиям типографий:</p>
              <ul className="mt-3 space-y-1.5 text-sm text-[#3b3631]">
                <li>Обрезной формат 210×280 мм</li>
                <li>Вылеты 3 мм со всех сторон, размеченные в PDF (TrimBox/BleedBox)</li>
                <li>Шрифты встроены, графики в высоком разрешении</li>
                <li>{issue.pages} полос — кратно 4, подходит для скрепки</li>
                <li>Цветность RGB: при печати в CMYK типография выполнит конвертацию и пришлёт цветопробу</li>
              </ul>
            </div>
            <div className="bg-[#14110f] text-[#f6f2ea] rounded-lg p-5 text-sm leading-relaxed">
              <Kicker className="!text-[#e8836f]">Авторские права</Kicker>
              <p className="mt-2">© ООО «МАТ-Лабс», 2026. Все материалы номера — тексты, расчёты, графики, рейтинг «Масштаб-500» и оформление — охраняются законом.</p>
              <p className="mt-2 text-white/70">Перепечатка, тиражирование и распространение, полностью или частично, — только с письменного согласия ООО «МАТ-Лабс». Цитирование — с указанием источника и активной ссылкой на mat-labs.ru/masshtab. 16+</p>
            </div>
            <Link to="/masshtab/arhiv" className="block text-sm font-bold text-[#d6402b]">Все номера в архиве →</Link>
            <Link to="/masshtab" className="block text-sm font-bold text-[#d6402b]">← Вернуться к онлайн-журналу</Link>
          </aside>
        </div>
      </div>
    </MShell>
  );
}
