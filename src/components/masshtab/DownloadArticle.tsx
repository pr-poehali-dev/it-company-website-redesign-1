import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import type { FullPost } from "./api";

type Fmt = "docx" | "html" | "md" | "txt";

const OPTIONS: { fmt: Fmt; label: string; hint: string }[] = [
  { fmt: "docx", label: "Word (.docx)", hint: "с графиками и таблицами — для редакций и PR" },
  { fmt: "html", label: "HTML", hint: "готовая вёрстка для сайта или CMS" },
  { fmt: "md", label: "Markdown", hint: "для Telegraph, блогов, GitHub" },
  { fmt: "txt", label: "Текст", hint: "без оформления — для соцсетей и рассылок" },
];

export const exportUrl = (slug: string, fmt: Fmt) => `/masshtab/export/${slug}/${fmt}`;

export default function DownloadArticle({ post }: { post: FullPost }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const copy = async () => {
    const x = await import("./exportArticle");
    const text = x.toText(post);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
    }
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(""), 3000);
  };

  return (
    <div ref={ref} className="relative inline-block font-['Golos_Text',sans-serif]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-semibold border border-[#14110f] rounded px-3.5 py-2 hover:bg-[#14110f] hover:text-[#f6f2ea] transition-colors"
        aria-expanded={open}
      >
        <Icon name="Download" size={16} />
        Скачать статью
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-[320px] max-w-[calc(100vw-32px)] bg-white border border-[#e2d9cb] rounded-lg shadow-xl p-2">
          {OPTIONS.map((o) => (
            <a
              key={o.fmt}
              href={exportUrl(post.slug, o.fmt)}
              download
              target="_blank"
              rel="noopener"
              onClick={() => setTimeout(() => setOpen(false), 300)}
              className="w-full text-left rounded px-3 py-2.5 hover:bg-[#f6f2ea] flex items-start gap-3"
            >
              <Icon name="FileText" size={18} className="mt-0.5 shrink-0 text-[#d6402b]" />
              <span>
                <span className="block text-sm font-bold text-[#14110f]">{o.label}</span>
                <span className="block text-xs text-[#8a8278]">{o.hint}</span>
              </span>
            </a>
          ))}
          <button type="button" onClick={copy} className="w-full text-left rounded px-3 py-2.5 hover:bg-[#f6f2ea] flex items-center gap-3 border-t border-[#e2d9cb] mt-1">
            <Icon name={copied === "ok" ? "Check" : "Copy"} size={18} className="shrink-0 text-[#d6402b]" />
            <span className="text-sm font-bold text-[#14110f]">
              {copied === "ok" ? "Текст скопирован" : copied === "fail" ? "Браузер запретил копирование — скачайте «Текст»" : "Скопировать текст"}
            </span>
          </button>
          <p className="text-[11px] leading-snug text-[#8a8278] px-3 pt-2 pb-1">
            При перепубликации укажите активную ссылку на «Масштаб» — она уже есть в конце файла.
          </p>
        </div>
      )}
    </div>
  );
}
