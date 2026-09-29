import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const routesFile = path.join(root, "src", "lib", "seo-routes.ts");
const raw = fs.readFileSync(routesFile, "utf8");

const body = raw.slice(
  raw.indexOf("export const seoRoutes"),
  raw.indexOf("export function canonicalFor")
);
const arrStart = body.indexOf("[");
const arrEnd = body.lastIndexOf("]");
const arrSrc = body.slice(arrStart, arrEnd + 1);

let seoRoutes;
try {
  seoRoutes = eval(`(${arrSrc})`);
} catch (e) {
  console.error("prerender: не удалось прочитать seo-routes.ts", e.message);
  process.exit(1);
}

const SITE = "https://mat-labs.ru";
const indexPath = path.join(dist, "index.html");

if (!fs.existsSync(indexPath)) {
  console.error("prerender: dist/index.html не найден, сначала нужна сборка");
  process.exit(1);
}

const template = fs.readFileSync(indexPath, "utf8");

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildContent(route) {
  const parts = [
    `<h1>${esc(route.h1)}</h1>`,
    `<p>${esc(route.intro)}</p>`,
  ];
  for (const s of route.sections) {
    parts.push(`<h2>${esc(s.heading)}</h2>`);
    parts.push(`<p>${esc(s.text)}</p>`);
  }
  return `<div id="seo-content">${parts.join("")}</div>`;
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function renderPage(route) {
  let html = template;
  const canonical = route.path === "/" ? `${SITE}/` : `${SITE}${route.path}`;

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`);
  html = replaceTag(
    html,
    /<meta name="description" content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${esc(route.description)}"/>`
  );
  html = replaceTag(
    html,
    /<link rel="canonical" href="[\s\S]*?"\s*\/?>/,
    `<link rel="canonical" href="${canonical}"/>`
  );
  html = replaceTag(
    html,
    /<meta property="og:title" content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:title" content="${esc(route.title)}">`
  );
  html = replaceTag(
    html,
    /<meta property="og:description" content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:description" content="${esc(route.description)}">`
  );
  html = replaceTag(
    html,
    /<meta property="og:url" content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:url" content="${canonical}">`
  );

  const content = buildContent(route);
  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>/,
    `<div id="root">${content}</div>`
  );

  if (!html.includes('id="seo-content"')) {
    html = html.replace("<body>", `<body><div id="root">${content}</div>`);
  }

  return html;
}

let count = 0;
for (const route of seoRoutes) {
  const html = renderPage(route);
  let outPath;
  if (route.path === "/") {
    outPath = path.join(dist, "index.html");
  } else {
    const dir = path.join(dist, route.path.replace(/^\//, ""));
    fs.mkdirSync(dir, { recursive: true });
    outPath = path.join(dir, "index.html");
  }
  fs.writeFileSync(outPath, html, "utf8");
  count++;
  console.log(`prerender: ${route.path} -> ${path.relative(dist, outPath)}`);
}

console.log(`prerender: готово, страниц собрано — ${count}`);
