import { Fragment, type ReactNode } from "react";

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[2]) out.push(<b key={k++}>{m[2]}</b>);
    else if (m[3]) out.push(<i key={k++}>{m[3]}</i>);
    else out.push(<a key={k++} href={m[5]} target="_blank" rel="noopener" className="text-[#d6402b] underline">{m[4]}</a>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export default function Markdown({ text }: { text: string }) {
  const blocks = (text || "").replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        const img = b.match(/^!\[([^\]]*)\]\((\S+?)\)$/);
        if (img) return (
          <figure key={i} className="my-8 font-['Golos_Text',sans-serif]">
            <img src={img[2].replace(/^https?:\/\/(?:учисьпро\.рф|xn--h1amcedk2a6b\.xn--p1ai)(?=\/img\/masshtab\/)/i, "")} alt={img[1]} loading="lazy" className="w-full rounded border border-[#e2d9cb]" />
            {img[1] && <figcaption className="text-xs text-[#8a8278] mt-2">{img[1]}</figcaption>}
          </figure>
        );
        if (b.startsWith("|")) {
          const rows = b.split("\n").filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
          const [head, ...body] = rows;
          return (
            <Fragment key={i}>
              <div className="hidden sm:block my-6 overflow-x-auto font-['Golos_Text',sans-serif]">
                <table className="w-full text-sm border-collapse">
                  <thead><tr className="border-b-2 border-[#14110f]">{head.map((h, j) => <th key={j} className={`py-2 pr-4 align-bottom font-bold text-[#14110f] ${j ? "text-right" : "text-left"}`}>{inline(h)}</th>)}</tr></thead>
                  <tbody>{body.map((r, k) => <tr key={k} className="border-b border-[#e2d9cb]">{r.map((c, j) => <td key={j} className={`py-2 pr-4 align-top ${j ? "text-right" : ""}`}>{inline(c)}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <div className="sm:hidden my-6 space-y-3 font-['Golos_Text',sans-serif] text-[15px] leading-snug">
                {body.map((r, k) => (
                  <div key={k} className="border border-[#e2d9cb] rounded bg-white/60 p-3">
                    <div className="font-bold text-[#14110f]">{inline(r[0] ?? "")}</div>
                    {r.slice(1).map((c, j) => c && c !== "—" ? (
                      <div key={j} className="flex justify-between gap-3 mt-1.5">
                        <span className="text-[#8a8278] shrink-0 max-w-[45%]">{inline(head[j + 1] ?? "")}</span>
                        <span className="text-right font-semibold min-w-0 [overflow-wrap:anywhere]">{inline(c)}</span>
                      </div>
                    ) : null)}
                  </div>
                ))}
              </div>
            </Fragment>
          );
        }
        if (b.startsWith("### ")) return <h3 key={i} className="font-['Playfair_Display',serif] font-bold text-xl md:text-2xl pt-2">{inline(b.slice(4))}</h3>;
        if (b.split("\n").every((l) => /^\d+[.)]\s/.test(l))) return (
          <ol key={i} className="list-decimal pl-6 space-y-1.5">{b.split("\n").map((l, j) => <li key={j}>{inline(l.replace(/^\d+[.)]\s/, ""))}</li>)}</ol>
        );
        if (b.startsWith("## ")) return <h2 key={i} className="font-['Playfair_Display',serif] font-bold text-2xl md:text-3xl pt-4">{inline(b.slice(3))}</h2>;
        if (b.startsWith("> ")) return (
          <blockquote key={i} className="border-l-4 border-[#d6402b] pl-5 my-8 font-['Playfair_Display',serif] italic text-2xl md:text-3xl leading-snug text-[#14110f]">
            {inline(b.replace(/^>\s?/gm, ""))}
          </blockquote>
        );
        if (/^—\s|^- /.test(b) && b.split("\n").every((l) => /^- /.test(l))) return (
          <ul key={i} className="list-disc pl-6 space-y-1.5">{b.split("\n").map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>
        );
        const q = b.match(/^\*\*(—?[^*]+?)\*\*\s*([\s\S]*)$/);
        if (q && q[1].length < 200 && b.startsWith("**")) return (
          <p key={i}><b className="text-[#14110f]">{inline(q[1])}</b>{q[2] ? <Fragment> {inline(q[2])}</Fragment> : null}</p>
        );
        return <p key={i}>{b.split("\n").map((l, j) => <Fragment key={j}>{j ? <br /> : null}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
