import type { FullPost } from "./api";
import { SITE } from "./seo";

const abs = (u: string) => (u.startsWith("http") ? u : `${SITE}${u}`);
const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
const lines = (s: string) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);

export const articleUrl = (p: FullPost) => `${SITE}/masshtab/${p.slug}`;
const dateRu = (s: string | null) => (s ? new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "");
const takeawaysOf = (p: FullPost) => lines(p.takeaways).map((x) => x.replace(/^[-—•\d.)\s]+/, ""));
const sourceOf = (s: string) => { const m = s.match(/^(.*?)\s*(https?:\/\/\S+)$/); return m ? { label: m[1] || m[2], url: m[2] } : { label: s, url: "" }; };
const credit = (p: FullPost) => `Материал журнала «Масштаб» (mat-labs.ru). При перепубликации обязательна активная ссылка на источник: ${articleUrl(p)}`;

type Block =
  | { t: "p"; text: string } | { t: "h2"; text: string } | { t: "h3"; text: string } | { t: "quote"; text: string }
  | { t: "ul"; items: string[] } | { t: "ol"; items: string[] } | { t: "img"; src: string; alt: string } | { t: "table"; rows: string[][] };

function parse(md: string): Block[] {
  return (md || "").replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b): Block => {
    const img = b.match(/^!\[([^\]]*)\]\((\S+?)\)$/);
    if (img) return { t: "img", src: abs(img[2]), alt: img[1] };
    if (b.startsWith("|")) return { t: "table", rows: b.split("\n").filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())) };
    if (b.startsWith("### ")) return { t: "h3", text: b.slice(4) };
    if (b.startsWith("## ")) return { t: "h2", text: b.slice(3) };
    if (b.startsWith("> ")) return { t: "quote", text: b.replace(/^>\s?/gm, "") };
    const ls = b.split("\n");
    if (ls.every((l) => /^- /.test(l))) return { t: "ul", items: ls.map((l) => l.slice(2)) };
    if (ls.every((l) => /^\d+[.)]\s/.test(l))) return { t: "ol", items: ls.map((l) => l.replace(/^\d+[.)]\s/, "")) };
    return { t: "p", text: ls.join(" ") };
  });
}

function inlineHtml(s: string) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function toHtml(p: FullPost) {
  const body = parse(p.content).map((b) => {
    switch (b.t) {
      case "h2": return `<h2>${inlineHtml(b.text)}</h2>`;
      case "h3": return `<h3>${inlineHtml(b.text)}</h3>`;
      case "quote": return `<blockquote>${inlineHtml(b.text)}</blockquote>`;
      case "ul": return `<ul>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ul>`;
      case "ol": return `<ol>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ol>`;
      case "img": return `<figure><img src="${esc(b.src)}" alt="${esc(b.alt)}"><figcaption>${esc(b.alt)}</figcaption></figure>`;
      case "table": {
        const [h, ...r] = b.rows;
        return `<table><thead><tr>${h.map((c) => `<th>${inlineHtml(c)}</th>`).join("")}</tr></thead><tbody>${r.map((row) => `<tr>${row.map((c) => `<td>${inlineHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      }
      default: return `<p>${inlineHtml(b.text)}</p>`;
    }
  }).join("\n");
  const tk = takeawaysOf(p);
  const src = lines(p.sources).map(sourceOf);
  const cover = p.cover_url && !p.content.includes(p.cover_url) ? `<figure><img src="${esc(abs(p.cover_url))}" alt="${esc(p.title)}"></figure>` : "";
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.lead)}">
<link rel="canonical" href="${articleUrl(p)}">
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.7;color:#222}h1{font-size:2em;line-height:1.2}.lead{font-size:1.2em;color:#555}.meta{color:#888;font-size:.9em}img{max-width:100%}figcaption{font-size:.85em;color:#888}table{border-collapse:collapse;width:100%;font-size:.9em}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}blockquote{border-left:4px solid #d6402b;margin:1.5em 0;padding-left:1em;font-style:italic;font-size:1.2em}.box{background:#f4efe6;padding:16px 20px;border-radius:6px}</style>
</head>
<body>
<article>
<p class="meta">${esc(p.rubric)} · ${esc(p.author)} · ${dateRu(p.published_at)}</p>
<h1>${esc(p.title)}</h1>
${p.lead ? `<p class="lead">${esc(p.lead)}</p>` : ""}
${p.data_date ? `<p class="meta">Данные актуальны на ${dateRu(p.data_date)}</p>` : ""}
${cover}
${tk.length ? `<div class="box"><h2>Главное</h2><ol>${tk.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
${body}
${p.question ? `<div class="box"><h3>Посчитайте для себя</h3><p>${esc(p.question)}</p></div>` : ""}
${src.length ? `<h3>Источники</h3><ul>${src.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}">${esc(s.label)}</a>` : esc(s.label)}</li>`).join("")}</ul>` : ""}
<hr>
<p class="meta">Материал журнала «Масштаб» (mat-labs.ru). При перепубликации обязательна активная ссылка на источник: <a href="${articleUrl(p)}">${articleUrl(p)}</a></p>
</article>
</body>
</html>
`;
}

export function toMarkdown(p: FullPost) {
  const tk = takeawaysOf(p);
  const src = lines(p.sources).map(sourceOf);
  const content = (p.content || "").replace(/!\[([^\]]*)\]\((\/[^)\s]+)\)/g, (_, a, u) => `![${a}](${abs(u)})`);
  return [
    `# ${p.title}`, p.lead, `*${p.rubric} · ${p.author} · ${dateRu(p.published_at)}*`,
    p.data_date ? `Данные актуальны на ${dateRu(p.data_date)}` : "",
    tk.length ? `## Главное\n\n${tk.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "",
    content,
    p.question ? `### Посчитайте для себя\n\n${p.question}` : "",
    src.length ? `### Источники\n\n${src.map((s) => `- ${s.url ? `[${s.label}](${s.url})` : s.label}`).join("\n")}` : "",
    `---\n\n${credit(p)}`,
  ].filter(Boolean).join("\n\n") + "\n";
}

export function toText(p: FullPost) {
  const tk = takeawaysOf(p);
  const src = lines(p.sources).map(sourceOf);
  const body = parse(p.content).map((b) => {
    switch (b.t) {
      case "h2": return plain(b.text).toUpperCase();
      case "h3": return plain(b.text);
      case "quote": return `«${plain(b.text)}»`;
      case "ul": return b.items.map((i) => `— ${plain(i)}`).join("\n");
      case "ol": return b.items.map((i, k) => `${k + 1}. ${plain(i)}`).join("\n");
      case "img": return `[Иллюстрация: ${b.alt}. ${b.src}]`;
      case "table": return b.rows.map((r) => r.map(plain).join(" | ")).join("\n");
      default: return plain(b.text);
    }
  }).join("\n\n");
  return [
    p.title.toUpperCase(), p.lead, `${p.rubric} · ${p.author} · ${dateRu(p.published_at)}`,
    p.data_date ? `Данные актуальны на ${dateRu(p.data_date)}` : "",
    tk.length ? `ГЛАВНОЕ\n${tk.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "",
    body,
    p.question ? `ПОСЧИТАЙТЕ ДЛЯ СЕБЯ\n${p.question}` : "",
    src.length ? `ИСТОЧНИКИ\n${src.map((s) => `— ${s.label}${s.url ? ` ${s.url}` : ""}`).join("\n")}` : "",
    credit(p),
  ].filter(Boolean).join("\n\n") + "\n";
}

type Img = { data: Uint8Array; w: number; h: number; type: "png" | "jpg" | "gif" };

function imageInfo(buf: ArrayBuffer): Img | null {
  const b = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { data: b, type: "png", w: dv.getUint32(16), h: dv.getUint32(20) };
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { data: b, type: "gif", w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { data: b, type: "jpg", h: dv.getUint16(i + 5), w: dv.getUint16(i + 7) };
      i += 2 + dv.getUint16(i + 2);
    }
  }
  return null;
}

const localPath = (url: string) => {
  const m = url.match(/^https?:\/\/[^/]+(\/img\/masshtab\/[^?#]+)$/);
  if (m) return m[1];
  return url.startsWith("/") ? url : null;
};

async function fetchImage(url: string, origin: string): Promise<Img | null> {
  const local = localPath(url);
  const tries = local ? [`${origin}${local}`, url] : [url];
  for (const u of tries) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const info = imageInfo(await r.arrayBuffer());
      if (info && info.w > 0 && info.h > 0) return info;
    } catch {
      continue;
    }
  }
  return null;
}

export async function toDocx(p: FullPost, origin: string): Promise<Uint8Array> {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, ExternalHyperlink, BorderStyle, AlignmentType } = d;
  const FONT = "Georgia";
  const runs = (s: string, base: { size?: number; color?: string; italics?: boolean; bold?: boolean } = {}) => {
    const out: (InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>)[] = [];
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(new TextRun({ text: s.slice(last, m.index), font: FONT, ...base }));
      if (m[1]) out.push(new TextRun({ text: m[1], font: FONT, ...base, bold: true }));
      else if (m[2]) out.push(new TextRun({ text: m[2], font: FONT, ...base, italics: true }));
      else out.push(new ExternalHyperlink({ link: m[4], children: [new TextRun({ text: m[3], font: FONT, ...base, style: "Hyperlink" })] }));
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push(new TextRun({ text: s.slice(last), font: FONT, ...base }));
    return out;
  };
  const para = (s: string, o: { size?: number; color?: string; italics?: boolean; bold?: boolean; after?: number } = {}) =>
    new Paragraph({ children: runs(s, { size: o.size ?? 24, color: o.color, italics: o.italics, bold: o.bold }), spacing: { after: o.after ?? 160, line: 320 } });
  const MAXW = 600;
  const image = async (src: string, alt: string) => {
    const img = await fetchImage(src, origin);
    if (!img) return [para(`[Иллюстрация: ${alt}] ${src}`, { italics: true, color: "888888", size: 20 })];
    const w = Math.min(MAXW, img.w), h = Math.round((img.h * w) / img.w);
    return [
      new Paragraph({ children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: w, height: h } })], spacing: { before: 120, after: 60 } }),
      ...(alt ? [para(alt, { italics: true, color: "888888", size: 18, after: 240 })] : []),
    ];
  };
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  children.push(para(`${p.rubric} · ${p.author} · ${dateRu(p.published_at)}`, { size: 18, color: "888888" }));
  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: p.title, font: FONT, bold: true, size: 44 })], spacing: { after: 200 } }));
  if (p.lead) children.push(para(p.lead, { size: 28, color: "555555", after: 200 }));
  if (p.data_date) children.push(para(`Данные актуальны на ${dateRu(p.data_date)}`, { size: 18, color: "888888" }));
  if (p.cover_url && !p.content.includes(p.cover_url)) children.push(...(await image(abs(p.cover_url), "")));
  const tk = takeawaysOf(p);
  if (tk.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Главное", font: FONT, bold: true, size: 30 })], spacing: { before: 240, after: 120 } }));
    tk.forEach((t, i) => children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true, color: "D6402B", font: FONT, size: 24 }), ...runs(t, { size: 24 })], spacing: { after: 100, line: 300 } })));
  }
  const border = { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" };
  for (const b of parse(p.content)) {
    if (b.t === "h2" || b.t === "h3") {
      children.push(new Paragraph({ heading: b.t === "h2" ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3, children: [new TextRun({ text: plain(b.text), font: FONT, bold: true, size: b.t === "h2" ? 30 : 26 })], spacing: { before: 320, after: 140 } }));
    } else if (b.t === "quote") {
      children.push(new Paragraph({ children: runs(b.text, { italics: true, size: 30 }), indent: { left: 400 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: "D6402B", space: 12 } }, spacing: { before: 200, after: 240 } }));
    } else if (b.t === "ul" || b.t === "ol") {
      b.items.forEach((it, i) => children.push(new Paragraph({ children: [new TextRun({ text: b.t === "ul" ? "•  " : `${i + 1}. `, font: FONT, size: 24 }), ...runs(it)], indent: { left: 360, hanging: 260 }, spacing: { after: 80, line: 300 } })));
      children.push(new Paragraph({ children: [], spacing: { after: 80 } }));
    } else if (b.t === "img") {
      children.push(...(await image(b.src, b.alt)));
    } else if (b.t === "table") {
      const [h, ...r] = b.rows;
      const mk = (cells: string[], head: boolean) => new TableRow({
        tableHeader: head,
        children: cells.map((c, j) => new TableCell({
          borders: { top: border, bottom: border, left: border, right: border },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ alignment: j ? AlignmentType.RIGHT : AlignmentType.LEFT, children: runs(c, { size: 19, bold: head }) })],
        })),
      });
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [mk(h, true), ...r.map((row) => mk(row, false))] }));
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    } else {
      children.push(para(b.text));
    }
  }
  if (p.question) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: "Посчитайте для себя", font: FONT, bold: true, size: 26 })], spacing: { before: 320, after: 120 } }));
    children.push(para(p.question));
  }
  const src = lines(p.sources).map(sourceOf);
  if (src.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: "Источники", font: FONT, bold: true, size: 24 })], spacing: { before: 320, after: 100 } }));
    src.forEach((s) => children.push(new Paragraph({
      children: s.url ? [new TextRun({ text: "•  ", font: FONT, size: 19 }), new ExternalHyperlink({ link: s.url, children: [new TextRun({ text: s.label, font: FONT, size: 19, style: "Hyperlink" })] })] : [new TextRun({ text: `•  ${s.label}`, font: FONT, size: 19 })],
      spacing: { after: 60 },
    })));
  }
  children.push(new Paragraph({
    children: [new TextRun({ text: "Материал журнала «Масштаб» (mat-labs.ru). При перепубликации обязательна активная ссылка на источник: ", font: FONT, size: 18, color: "888888" }), new ExternalHyperlink({ link: articleUrl(p), children: [new TextRun({ text: articleUrl(p), font: FONT, size: 18, style: "Hyperlink" })] })],
    spacing: { before: 400 },
  }));
  const doc = new Document({
    creator: "Журнал «Масштаб»", title: p.title, description: p.lead,
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
