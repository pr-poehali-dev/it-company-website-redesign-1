import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
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
    <meta property="og:type" content="website">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:site_name" content="ООО МАТ-Лабс">
    <meta property="og:title" content="${esc(r.title)}">
    <meta property="og:description" content="${esc(r.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:image:width" content="1024">
    <meta property="og:image:height" content="1024">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(r.title)}">
    <meta name="twitter:description" content="${esc(r.description)}">
    <meta name="twitter:image" content="${OG_IMAGE}">
${schemas.map((s) => `    <script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}`;
}

function buildNoscript(r) {
  const nav = r.crumbs
    .map(([n, h]) => `<a href="${h}">${esc(n)}</a>`)
    .join(" › ");
  return `<div id="seo-content" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">
<nav>${nav}</nav>
<h1>${esc(r.h1)}</h1>
${r.body.filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("\n")}
</div>`;
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

console.log(`prerender: создано ${written} статичных страниц`);
console.log(`  гео-услуги: ${geoServices.length} × ${cities.length} = ${geoServices.length * cities.length}`);
console.log(`  города: ${cities.length}, услуги: ${services.length}, хабы: 3`);