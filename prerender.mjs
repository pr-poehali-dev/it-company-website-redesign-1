import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = process.env.VITE_OUT_DIR
  ? path.resolve(process.env.VITE_OUT_DIR)
  : path.join(__dirname, "dist");
const SITE = "https://mat-labs.ru";
const OG_IMAGE =
  "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/bucket/445e832b-e1ed-413e-a842-7a510d6d41f1.jpg";

function readTs(file) {
  return fs.readFileSync(path.join(__dirname, "src", file), "utf-8");
}

function parseObjects(src, startMarker) {
  const i = src.indexOf(startMarker);
  if (i === -1) return [];
  const out = [];
  let depth = 0,
    cur = "",
    started = false;
  for (let k = src.indexOf("[", i); k < src.length; k++) {
    const ch = src[k];
    if (ch === "{") {
      depth++;
      started = true;
    }
    if (started) cur += ch;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        out.push(cur);
        cur = "";
        started = false;
      }
    }
    if (ch === "]" && depth === 0 && out.length) break;
  }
  return out;
}

function field(block, name) {
  const m = block.match(new RegExp(`\\b${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1].replace(/\\"/g, '"') : "";
}

function numField(block, name) {
  const m = block.match(new RegExp(`\\b${name}:\\s*(\\d+)`));
  return m ? parseInt(m[1], 10) : 0;
}

const BLOG_API = "https://functions.poehali.dev/f6938906-b3c4-4bf7-b1f9-96560e19ef1b/";

const cyrillicMap = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function generateSlug(title) {
  return title
    .split("")
    .map((ch) => {
      const low = ch.toLowerCase();
      return cyrillicMap[low] !== undefined && /[а-яё]/i.test(ch) ? cyrillicMap[low] : ch;
    })
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function fetchPosts() {
  try {
    const res = await fetch(BLOG_API, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.posts || []).filter((p) => p.content && p.title);
  } catch (e) {
    console.warn(`[seo-prerender] статьи блога не загружены: ${e.message}`);
    return [];
  }
}

export async function prerender() {
const posts = await fetchPosts();
const citiesSrc = readTs("lib/cities.ts");
const geoSrc = readTs("lib/serviceGeo.ts");
const sharedSrc = readTs("components/shared.tsx");

const cities = parseObjects(citiesSrc, "export const cities")
  .map((b) => ({
    slug: field(b, "slug"),
    name: field(b, "name"),
    nameIn: field(b, "nameIn"),
    nameGen: field(b, "nameGen"),
    population: field(b, "population"),
    pain: field(b, "pain"),
  }))
  .filter((c) => c.slug && c.nameIn);

const geoServices = parseObjects(geoSrc, "export const geoServices")
  .map((b) => ({
    slug: field(b, "slug"),
    h1: field(b, "h1"),
    short: field(b, "short"),
    intro: field(b, "intro"),
    days: field(b, "days"),
    price: numField(b, "price"),
  }))
  .filter((s) => s.slug && s.h1);

const services = parseObjects(sharedSrc, "export const services")
  .map((b) => ({
    slug: field(b, "slug"),
    title: field(b, "title"),
    desc: field(b, "desc"),
    price: field(b, "price"),
    fullDesc: field(b, "fullDesc"),
  }))
  .filter((s) => s.slug && s.title);

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmt = (n) => n.toLocaleString("ru-RU");
const clip = (s, n) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
};

function fitTitle(main, brand = " | МАТ-Лабс", max = 68) {
  return main.length + brand.length <= max ? main + brand : clip(main, max);
}

const routes = [];

for (const svc of geoServices) {
  for (const city of cities) {
    const url = `/uslugi/${svc.slug}/${city.slug}`;
    routes.push({
      url,
      title: fitTitle(`${svc.h1} в ${city.nameIn} — от ${fmt(svc.price)} ₽`),
      description: clip(
        `${svc.h1} в ${city.nameIn}. ${svc.intro} Срок — ${svc.days}, цена от ${fmt(svc.price)} ₽. Работаем удалённо по всей России.`,
        170,
      ),
      h1: `${svc.h1} в ${city.nameIn}`,
      body: [
        svc.intro,
        `Стоимость — от ${fmt(svc.price)} ₽, срок выполнения — ${svc.days}.`,
        `Для компаний из ${city.nameGen} цена не отличается от других регионов: наценки за удалённость нет.`,
        city.pain,
      ],
      schema: {
        "@context": "https://schema.org",
        "@type": "Service",
        name: `${svc.h1} в ${city.nameIn}`,
        serviceType: svc.short,
        provider: { "@type": "Organization", name: "ООО МАТ-Лабс", url: SITE },
        areaServed: { "@type": "City", name: city.name },
        url: SITE + url,
        offers: {
          "@type": "Offer",
          priceCurrency: "RUB",
          price: String(svc.price),
          availability: "https://schema.org/InStock",
        },
      },
      crumbs: [
        ["Главная", "/"],
        ["Услуги", "/uslugi"],
        [svc.short, `/services/${svc.slug}`],
        [city.name, url],
      ],
    });
  }
}

for (const city of cities) {
  const url = `/avtomatizaciya-biznesa/${city.slug}`;
  routes.push({
    url,
    title: fitTitle(`Автоматизация бизнеса в ${city.nameIn}`),
    description: clip(
      `Автоматизация бизнес-процессов и внедрение AI в ${city.nameIn}. Обработка заявок, интеграция CRM, аналитика. Внедрение за 7–14 дней, от 150 000 ₽.`,
      170,
    ),
    h1: `Автоматизация бизнеса в ${city.nameIn}`,
    body: [
      `Автоматизируем обработку заявок, интегрируем CRM и внедряем AI для компаний из ${city.nameGen}.`,
      city.pain,
      "Внедрение занимает 7–14 дней. Работаем дистанционно по всей России.",
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `Автоматизация бизнеса в ${city.nameIn}`,
      provider: { "@type": "Organization", name: "ООО МАТ-Лабс", url: SITE },
      areaServed: { "@type": "City", name: city.name },
      url: SITE + url,
    },
    crumbs: [
      ["Главная", "/"],
      ["Автоматизация по городам", "/avtomatizaciya-biznesa"],
      [city.name, url],
    ],
  });
}

for (const svc of services) {
  const url = `/services/${svc.slug}`;
  routes.push({
    url,
    title: fitTitle(`${svc.title} — ${svc.price}`),
    description: clip(svc.desc || svc.fullDesc, 170),
    h1: svc.title,
    body: [svc.fullDesc || svc.desc, `Стоимость — ${svc.price}.`],
    schema: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: svc.title,
      description: svc.desc,
      provider: { "@type": "Organization", name: "ООО МАТ-Лабс", url: SITE },
      url: SITE + url,
    },
    crumbs: [
      ["Главная", "/"],
      ["Услуги", "/uslugi"],
      [svc.title, url],
    ],
  });
}

routes.push({
  url: "/uslugi",
  title: "Услуги по городам России — разработка, ИИ, аналитика | МАТ-Лабс",
  description: clip(
    `Разработка сайтов, AI-автоматизация, ИИ-решения, аналитика данных и мобильные приложения в ${cities.length} городах России. Цены от 150 000 ₽.`,
    170,
  ),
  h1: "Услуги по городам России",
  body: [
    "Разработка сайтов, AI-автоматизация, ИИ и ML-решения, аналитика данных, мобильные приложения и кибербезопасность.",
    "Головной офис в Самаре, работаем по всей стране дистанционно. Наценки за регион не делаем.",
  ],
  crumbs: [
    ["Главная", "/"],
    ["Услуги по городам", "/uslugi"],
  ],
});

routes.push({
  url: "/avtomatizaciya-biznesa",
  title: "Автоматизация бизнеса по городам России | МАТ-Лабс",
  description: clip(
    `Внедряем автоматизацию и AI в ${cities.length} городах России. Обработка заявок, интеграция CRM, аналитика. От 150 000 ₽, внедрение за 7–14 дней.`,
    170,
  ),
  h1: "Автоматизация бизнеса по городам России",
  body: [
    "Автоматизируем обработку заявок, интегрируем CRM и внедряем AI для компаний по всей стране.",
    "Работаем дистанционно, цена не зависит от региона заказчика.",
  ],
  crumbs: [
    ["Главная", "/"],
    ["Автоматизация по городам", "/avtomatizaciya-biznesa"],
  ],
});

const turnkeySrc = readTs("lib/turnkey.ts");
const turnkey = parseObjects(turnkeySrc, "export const turnkeyProducts")
  .map((b) => ({
    title: field(b, "title"),
    niche: field(b, "niche"),
    pitch: field(b, "pitch"),
    whoFor: field(b, "whoFor"),
    launchPrice: numField(b, "launchPrice"),
    supportPrice: numField(b, "supportPrice"),
    launchDays: field(b, "launchDays"),
  }))
  .filter((p) => p.title && p.launchPrice);

if (turnkey.length) {
  const minL = Math.min(...turnkey.map((p) => p.launchPrice));
  const minS = Math.min(...turnkey.map((p) => p.supportPrice));
  routes.push({
    url: "/gotovyy-biznes",
    title: "Готовый IT-бизнес под ключ — запуск и сопровождение | МАТ-Лабс",
    description: clip(
      `Запустите готовый онлайн-бизнес под своим брендом: ${turnkey.map((p) => p.niche.toLowerCase()).join(", ")}. Запуск от ${fmt(minL)} ₽, сопровождение от ${fmt(minS)} ₽/мес.`,
      170,
    ),
    h1: "Готовый IT-бизнес под ключ",
    bodyHtml:
      `<p>Берёте проект, который уже работает. Мы разворачиваем копию под ваш бренд и город, обучаем и ведём техническую часть.</p>\n` +
      turnkey
        .map(
          (p) =>
            `<h2>${esc(p.title)} — ${esc(p.niche)}</h2>\n<p>${esc(p.pitch)}</p>\n<p>Подойдёт: ${esc(p.whoFor)}. Запуск — ${fmt(p.launchPrice)} ₽, сопровождение — ${fmt(p.supportPrice)} ₽ в месяц, срок — ${esc(p.launchDays)}.</p>`,
        )
        .join("\n") +
      `\n<p>Мы не гарантируем доход: отвечаем за работающий продукт, запуск и поддержку.</p>`,
    lastmod: new Date().toISOString().slice(0, 10),
    schema: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Готовый бизнес под ключ",
      itemListElement: turnkey.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Service",
          name: `${p.title} — готовый бизнес под ключ`,
          description: p.pitch,
          provider: { "@type": "Organization", name: "ООО МАТ-Лабс", url: SITE },
          offers: { "@type": "Offer", priceCurrency: "RUB", price: String(p.launchPrice) },
        },
      })),
    },
    crumbs: [
      ["Главная", "/"],
      ["Готовый бизнес под ключ", "/gotovyy-biznes"],
    ],
  });
}

routes.push({
  url: "/skolko-stoit-avtomatizaciya",
  title: "Сколько стоит автоматизация бизнеса — расчёт | МАТ-Лабс",
  description:
    "Рассчитайте стоимость автоматизации бизнес-процессов и внедрения AI. Пакеты от 150 000 ₽, сопровождение от 30 000 ₽ в месяц. Бесплатный разбор задачи.",
  h1: "Сколько стоит автоматизация бизнеса",
  body: [
    "Стоимость зависит от объёма задачи. Базовые пакеты начинаются от 150 000 ₽, сопровождение — от 30 000 ₽ в месяц.",
    "На бесплатном разборе оцениваем задачу и называем точную цену без обязательств.",
  ],
  crumbs: [
    ["Главная", "/"],
    ["Стоимость автоматизации", "/skolko-stoit-avtomatizaciya"],
  ],
});

function inlineMd(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function mdToHtml(md) {
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)/))) {
      closeList();
      const lvl = Math.max(2, m[1].length);
      out.push(`<h${lvl}>${inlineMd(m[2])}</h${lvl}>`);
    } else if ((m = line.match(/^[-*]\s+(.*)/))) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inlineMd(m[1])}</li>`);
    } else if ((m = line.match(/^\d+\.\s*(.*)/))) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inlineMd(m[1])}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inlineMd(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

const plain = (md) =>
  md.replace(/[#*`_~]/g, "").replace(/\s+/g, " ").trim();

const blogPosts = [];
const seenSlugs = new Set();
for (const p of posts) {
  const slug = generateSlug(p.title);
  if (!slug || seenSlugs.has(slug)) continue;
  seenSlugs.add(slug);
  blogPosts.push({ ...p, slug, url: `/blog/${slug}` });
}

for (const p of blogPosts) {
  const description = clip(plain(p.content), 165);
  const published = (p.created_at || "").slice(0, 10);
  const modified = (p.updated_at || p.created_at || "").slice(0, 10);
  routes.push({
    url: p.url,
    title: fitTitle(p.title, " | Блог МАТ-Лабс", 75),
    description,
    h1: p.title,
    bodyHtml: mdToHtml(p.content),
    ogType: "article",
    image: p.cover_url || null,
    lastmod: modified,
    schema: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description,
      ...(p.cover_url ? { image: p.cover_url } : {}),
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {}),
      author: { "@type": "Organization", name: "ООО МАТ-Лабс", url: SITE },
      publisher: { "@type": "Organization", name: "ООО МАТ-Лабс", url: SITE },
      mainEntityOfPage: SITE + p.url,
      inLanguage: "ru",
    },
    crumbs: [
      ["Главная", "/"],
      ["Блог", "/blog"],
      [p.title, p.url],
    ],
  });
}

if (blogPosts.length) {
  routes.push({
    url: "/blog",
    title: "Блог об автоматизации бизнеса и AI | МАТ-Лабс",
    description:
      "Статьи и разборы от инженеров МАТ-Лабс: автоматизация бизнес-процессов, внедрение AI, гранты, цифровизация отраслей и опыт собственных продуктов.",
    h1: "Блог МАТ-Лабс",
    bodyHtml:
      "<p>Статьи, кейсы и технические разборы от наших инженеров.</p>\n<ul>\n" +
      blogPosts
        .map((p) => `<li><a href="${p.url}">${esc(p.title)}</a></li>`)
        .join("\n") +
      "\n</ul>",
    lastmod: blogPosts
      .map((p) => (p.updated_at || p.created_at || "").slice(0, 10))
      .sort()
      .pop(),
    schema: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Блог МАТ-Лабс",
      url: SITE + "/blog",
      publisher: { "@type": "Organization", name: "ООО МАТ-Лабс", url: SITE },
      blogPost: blogPosts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: SITE + p.url,
      })),
    },
    crumbs: [
      ["Главная", "/"],
      ["Блог", "/blog"],
    ],
  });
}

const tpl = fs.readFileSync(path.join(DIST, "index.html"), "utf-8");

function buildHead(r) {
  const canonical = SITE + r.url;
  const crumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: r.crumbs.map(([name, href], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: SITE + href,
    })),
  };
  const schemas = [crumbSchema];
  if (r.schema) schemas.push(r.schema);

  return `    <title>${esc(r.title)}</title>
    <meta name="description" content="${esc(r.description)}"/>
    <meta name="robots" content="index, follow"/>
    <link rel="canonical" href="${canonical}"/>
    <meta property="og:type" content="${r.ogType || "website"}">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:site_name" content="ООО МАТ-Лабс">
    <meta property="og:title" content="${esc(r.title)}">
    <meta property="og:description" content="${esc(r.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${esc(r.image || OG_IMAGE)}">${r.image ? "" : `
    <meta property="og:image:width" content="1024">
    <meta property="og:image:height" content="1024">`}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(r.title)}">
    <meta name="twitter:description" content="${esc(r.description)}">
    <meta name="twitter:image" content="${esc(r.image || OG_IMAGE)}">
${schemas.map((s) => `    <script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}`;
}

function buildNoscript(r) {
  const nav = r.crumbs
    .map(([n, h]) => `<a href="${h}">${esc(n)}</a>`)
    .join(" › ");
  return `<div id="seo-content" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">
<nav>${nav}</nav>
<h1>${esc(r.h1)}</h1>
${r.bodyHtml ?? r.body.filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("\n")}
</div>`;
}

function updateSitemap() {
  const file = path.join(DIST, "sitemap.xml");
  if (!fs.existsSync(file)) return 0;
  let xml = fs.readFileSync(file, "utf-8");
  const extra = routes.filter(
    (r) => (r.url.startsWith("/blog") || r.url === "/gotovyy-biznes") && !xml.includes(`<loc>${SITE}${r.url}</loc>`),
  );
  if (!extra.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const items = extra
    .map(
      (r) => `  <url>
    <loc>${SITE}${r.url}</loc>
    <lastmod>${r.lastmod || today}</lastmod>
    <changefreq>${r.url === "/blog" ? "weekly" : "monthly"}</changefreq>
    <priority>${r.url === "/blog" ? "0.7" : r.url === "/gotovyy-biznes" ? "0.8" : "0.6"}</priority>
  </url>`,
    )
    .join("\n");
  xml = xml.replace("</urlset>", `${items}\n</urlset>`);
  fs.writeFileSync(file, xml, "utf-8");
  return extra.length;
}

let written = 0;
for (const r of routes) {
  let html = tpl;

  html = html.replace(/<title>[\s\S]*?<\/title>/, "___TITLE___");
  html = html.replace(
    /\s*<meta name="description"[^>]*>/,
    "",
  );
  html = html.replace(/\s*<meta name="robots"[^>]*>/, "");
  html = html.replace(/\s*<link rel="canonical"[^>]*>/, "");
  html = html.replace(/\s*<meta property="og:(title|description|url|type|locale|site_name|image|image:type|image:width|image:height|image:alt)"[^>]*>/g, "");
  html = html.replace(/\s*<meta name="twitter:[^"]*"[^>]*>/g, "");
  html = html.replace("___TITLE___", buildHead(r));

  html = html.replace(/<h1>/g, "<h2>").replace(/<\/h1>/g, "</h2>");

  html = html.replace(
    /(<div id="root">)/,
    `${buildNoscript(r)}\n$1`,
  );

  const dir = path.join(DIST, r.url.replace(/^\//, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
  written++;
}

const added = updateSitemap();

console.log(`prerender: создано ${written} статичных страниц`);
console.log(`  гео-услуги: ${geoServices.length} × ${cities.length} = ${geoServices.length * cities.length}`);
console.log(`  города: ${cities.length}, услуги: ${services.length}, хабы: 3`);
console.log(`  блог: ${blogPosts.length} статей${blogPosts.length ? " + список" : ""}, в sitemap добавлено: ${added}`);
return written;
}

export default function prerenderPlugin() {
  return {
    name: "seo-prerender",
    apply: "build",
    async closeBundle() {
      try {
        await prerender();
      } catch (e) {
        console.warn(`[seo-prerender] пропущен: ${e.message}`);
      }
    },
  };
}