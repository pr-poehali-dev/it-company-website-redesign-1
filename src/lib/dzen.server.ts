import "@tanstack/react-start/server-only";

const SITE = "https://mat-labs.ru";

export interface FeedPost {
  slug: string; rubric: string; title: string; lead: string; hero_name: string; hero_role: string; cover_url: string | null;
  author: string; published_at: string | null; created_at: string; data_date: string | null; content: string;
  takeaways: string; sources: string; question: string; kind: string;
}

export const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (u: string) => (u.startsWith("http") ? u : `${SITE}${u}`);
const cdata = (s: string) => s.replace(/]]>/g, "]]]]><![CDATA[>");

function inline(s: string) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

const plain = (s: string) => s.replace(/\*\*|\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function table(block: string) {
  const rows = block.split("\n").filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  const [head, ...body] = rows;
  return `<ul>${body.map((r) => `<li>${esc(plain(r.map((c, i) => (i && head[i] ? `${head[i]}: ${c}` : c)).join(" — ")))}</li>`).join("")}</ul>`;
}

export function toDzenHtml(md: string) {
  return (md || "").replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const img = b.match(/^!\[([^\]]*)\]\((\S+?)\)$/);
    if (img) return `<figure><img src="${esc(abs(img[2]))}"><figcaption>${esc(img[1])}</figcaption></figure>`;
    if (b.startsWith("|")) return table(b);
    if (b.startsWith("### ")) return `<h3>${esc(plain(b.slice(4)))}</h3>`;
    if (b.split("\n").every((l) => /^\d+[.)]\s/.test(l))) return `<ol>${b.split("\n").map((l) => `<li>${esc(plain(l.replace(/^\d+[.)]\s/, "")))}</li>`).join("")}</ol>`;
    if (b.startsWith("## ")) return `<h2>${esc(plain(b.slice(3)))}</h2>`;
    if (b.startsWith("> ")) return `<blockquote>${inline(b.replace(/^>\s?/gm, ""))}</blockquote>`;
    if (b.split("\n").every((l) => /^- /.test(l))) return `<ul>${b.split("\n").map((l) => `<li>${esc(plain(l.slice(2)))}</li>`).join("")}</ul>`;
    return `<p>${b.split("\n").map(inline).join("<br>")}</p>`;
  }).join("\n");
}

export function dzenItem(p: FeedPost) {
  const url = `${SITE}/masshtab/${p.slug}`;
  const cover = p.cover_url ? abs(p.cover_url) : "";
  const lines = (s: string) => (s || "").split("\n").map((x) => x.replace(/^[-—•\d.)\s]+/, "").trim()).filter(Boolean);
  const takeaways = lines(p.takeaways);
  const sources = (p.sources || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const dataDate = p.data_date ? new Date(p.data_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";
  const body = [
    `<h1>${esc(p.title)}</h1>`,
    p.lead ? `<p><b>${esc(p.lead)}</b></p>` : "",
    dataDate ? `<p><i>Данные актуальны на ${esc(dataDate)}</i></p>` : "",
    cover && !p.content.includes(p.cover_url || "") ? `<figure><img src="${esc(cover)}"><figcaption>${esc(p.hero_name ? `${p.hero_name}${p.hero_role ? `, ${p.hero_role}` : ""}` : p.title)}</figcaption></figure>` : "",
    takeaways.length ? `<h2>Главное</h2><ol>${takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>` : "",
    toDzenHtml(p.content),
    p.question ? `<h3>Посчитайте для себя</h3>${toDzenHtml(p.question)}` : "",
    sources.length ? `<h3>Источники</h3><ul>${sources.map((s) => esc(s.replace(/\s*https?:\/\/\S+$/, ""))).map((s) => `<li>${s}</li>`).join("")}</ul>` : "",
    `<p>Полная версия с графиками и рейтингом «Масштаб-500» — на сайте журнала: <a href="${url}">mat-labs.ru/masshtab</a></p>`,
  ].filter(Boolean).join("\n");
  const date = new Date(p.published_at || p.created_at).toUTCString().replace("GMT", "+0000");
  return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <pdalink>${url}</pdalink>
      <guid>${url}</guid>
      <pubDate>${date}</pubDate>
      <author>${esc(p.author || "Редакция «Масштаба»")}</author>
      <media:rating scheme="urn:simple">nonadult</media:rating>
      <category>format-article</category>
      <category>index</category>
      <category>comment-all</category>${cover ? `\n      <enclosure url="${esc(cover)}" type="image/${cover.endsWith(".png") ? "png" : "jpeg"}"/>` : ""}
      <description>${esc(p.lead)}</description>
      <content:encoded><![CDATA[${cdata(body)}]]></content:encoded>
    </item>`;
}
