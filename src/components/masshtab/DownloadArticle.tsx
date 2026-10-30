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

export default function DownloadArticle({ post }: { post: FullPost }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Fmt | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const download = async (fmt: Fmt) => {
    setBusy(fmt);
    try {
      const x = await import("./exportArticle");
      const name = `masshtab-${post.slug.slice(0, 60)}`;
      if (fmt === "docx") x.saveBlob(await x.toDocx(post), `${name}.docx`);
      if (fmt === "html") x.saveBlob(new Blob([x.toHtml(post)], { type: "text/html;charset=utf-8" }), `${name}.html`);
      if (fmt === "md") x.saveBlob(new Blob([x.toMarkdown(post)], { type: "text/markdown;charset=utf-8" }), `${name}.md`);
      if (fmt === "txt") x.saveBlob(new Blob([x.toText(post)], { type: "text/plain;charset=utf-8" }), `${name}.txt`);
      setOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    const x = await import("./exportArticle");
    await navigator.clipboard.writeText(x.toText(post));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="absolute left-0 z-30 mt-2 w-[320px] bg-white border border-[#e2d9cb] rounded-lg shadow-xl p-2">
          {OPTIONS.map((o) => (
            <button
              key={o.fmt}
              type="button"
              disabled={busy !== null}
              onClick={() => download(o.fmt)}
              className="w-full text-left rounded px-3 py-2.5 hover:bg-[#f6f2ea] disabled:opacity-50 flex items-start gap-3"
            >
              <Icon name={busy === o.fmt ? "Loader2" : "FileText"} size={18} className={`mt-0.5 shrink-0 text-[#d6402b] ${busy === o.fmt ? "animate-spin" : ""}`} />
              <span>
                <span className="block text-sm font-bold text-[#14110f]">{o.label}</span>
                <span className="block text-xs text-[#8a8278]">{o.hint}</span>
              </span>
            </button>
          ))}
          <button type="button" onClick={copy} className="w-full text-left rounded px-3 py-2.5 hover:bg-[#f6f2ea] flex items-center gap-3 border-t border-[#e2d9cb] mt-1">
            <Icon name={copied ? "Check" : "Copy"} size={18} className="shrink-0 text-[#d6402b]" />
            <span className="text-sm font-bold text-[#14110f]">{copied ? "Текст скопирован" : "Скопировать текст"}</span>
          </button>
          <p className="text-[11px] leading-snug text-[#8a8278] px-3 pt-2 pb-1">
            При перепубликации укажите активную ссылку на «Масштаб» — она уже есть в конце файла.
          </p>
        </div>
      )}
    </div>
  );
}
