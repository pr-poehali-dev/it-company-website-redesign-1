import * as XLSX from "xlsx";

export type ColType = "number" | "date" | "text";
export type Agg = "sum" | "avg" | "count" | "min" | "max" | "uniq";
export type ChartType = "bar" | "hbar" | "line" | "area" | "pie" | "kpi" | "table";
export type Row = Record<string, string | number | null>;

export interface Column { name: string; type: ColType; unique: number; empty: number; sample: string[] }

export interface Dataset {
  name: string;
  columns: Column[];
  rows: Row[];
}

export interface Widget {
  id: string;
  title: string;
  type: ChartType;
  dim?: string;
  dateGrain?: "day" | "month" | "quarter" | "year";
  measure?: string;
  agg: Agg;
  limit: number;
  sort: "value" | "label";
}

export interface Filter { column: string; values: string[] }

export interface Dashboard { dataset: Dataset; widgets: Widget[]; filters: Filter[] }

const NUM_RE = /^-?[\d\s\u00a0]+([.,]\d+)?$/;
const DATE_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$|^(\d{4})-(\d{2})-(\d{2})/;

export function parseNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const s = String(v).trim().replace(/[₽$€%]/g, "").trim();
  if (!s || !NUM_RE.test(s)) return null;
  const n = Number(s.replace(/[\s\u00a0]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  if (typeof v !== "string") return null;
  const m = v.trim().match(DATE_RE);
  if (!m) return null;
  if (m[4]) return `${m[4]}-${m[5]}-${m[6]}`;
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  const d = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function readFile(file: File): Promise<Dataset> {
  const buf = await file.arrayBuffer();
  const isCsv = /\.(csv|txt)$/i.test(file.name);
  let wb: XLSX.WorkBook;
  if (isCsv) {
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("\ufffd")) text = new TextDecoder("windows-1251").decode(buf);
    const first = text.split(/\r?\n/)[0] || "";
    const sep = [";", "\t", ","].sort((a, b) => first.split(b).length - first.split(a).length)[0];
    wb = XLSX.read(text, { type: "string", FS: sep, cellDates: true, raw: true });
  } else {
    wb = XLSX.read(buf, { type: "array", cellDates: true });
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  return buildDataset(file.name.replace(/\.[^.]+$/, ""), raw);
}

export function buildDataset(name: string, raw: Record<string, unknown>[]): Dataset {
  const rows = raw.slice(0, 200000);
  const keys = Array.from(new Set(rows.slice(0, 200).flatMap(r => Object.keys(r)))).filter(k => !/^__EMPTY/.test(k));
  const columns: Column[] = keys.map(k => {
    const vals = rows.slice(0, 2000).map(r => r[k]).filter(v => v != null && String(v).trim() !== "");
    const nums = vals.filter(v => parseNumber(v) != null).length;
    const dates = vals.filter(v => parseDate(v) != null).length;
    const type: ColType = vals.length && dates / vals.length > 0.8 ? "date" : vals.length && nums / vals.length > 0.85 ? "number" : "text";
    return { name: k, type, unique: 0, empty: 0, sample: vals.slice(0, 3).map(v => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v))) };
  });
  const out: Row[] = rows.map(r => {
    const o: Row = {};
    columns.forEach(c => {
      const v = r[c.name];
      o[c.name] = c.type === "number" ? parseNumber(v) : c.type === "date" ? parseDate(v) : v == null ? null : String(v).trim();
    });
    return o;
  });
  columns.forEach(c => {
    const set = new Set<string>();
    let empty = 0;
    out.forEach(r => { const v = r[c.name]; if (v == null || v === "") empty++; else if (set.size < 100001) set.add(String(v)); });
    c.unique = set.size;
    c.empty = empty;
  });
  return { name, columns, rows: out };
}

export function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  const active = filters.filter(f => f.values.length);
  if (!active.length) return rows;
  const sets = active.map(f => ({ c: f.column, s: new Set(f.values) }));
  return rows.filter(r => sets.every(({ c, s }) => s.has(String(r[c] ?? "—"))));
}

function grainKey(v: string, g: Widget["dateGrain"]): string {
  if (!v) return "—";
  if (g === "year") return v.slice(0, 4);
  if (g === "quarter") return `${v.slice(0, 4)}-Q${Math.floor((Number(v.slice(5, 7)) - 1) / 3) + 1}`;
  if (g === "day") return v;
  return v.slice(0, 7);
}

export function aggregate(rows: Row[], w: Widget, ds: Dataset): { label: string; value: number }[] | number {
  const mcol = w.measure;
  const calc = (vals: (string | number | null)[]): number => {
    if (w.agg === "count") return vals.length;
    if (w.agg === "uniq") return new Set(vals.filter(v => v != null)).size;
    const nums = vals.map(v => (typeof v === "number" ? v : null)).filter((v): v is number => v != null);
    if (!nums.length) return 0;
    if (w.agg === "sum") return nums.reduce((a, b) => a + b, 0);
    if (w.agg === "avg") return nums.reduce((a, b) => a + b, 0) / nums.length;
    if (w.agg === "min") return Math.min(...nums);
    return Math.max(...nums);
  };
  if (w.type === "kpi" || !w.dim) return calc(rows.map(r => (mcol ? r[mcol] : 1)));
  const dimCol = ds.columns.find(c => c.name === w.dim);
  const groups = new Map<string, (string | number | null)[]>();
  rows.forEach(r => {
    let k = r[w.dim!];
    const key = dimCol?.type === "date" ? grainKey(String(k ?? ""), w.dateGrain || "month") : String(k ?? "—");
    k = key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(mcol ? r[mcol] : 1);
  });
  let out = Array.from(groups.entries()).map(([label, vals]) => ({ label, value: calc(vals) }));
  if (dimCol?.type === "date" || w.sort === "label") out.sort((a, b) => a.label.localeCompare(b.label, "ru", { numeric: true }));
  else out.sort((a, b) => b.value - a.value);
  if (dimCol?.type !== "date" && out.length > w.limit) {
    const head = out.slice(0, w.limit - 1);
    const rest = out.slice(w.limit - 1);
    const other = w.agg === "sum" || w.agg === "count" ? rest.reduce((a, b) => a + b.value, 0) : null;
    out = other != null ? [...head, { label: `Прочие (${rest.length})`, value: other }] : head;
  }
  return out;
}

export const AGG_LABEL: Record<Agg, string> = { sum: "Сумма", avg: "Среднее", count: "Количество строк", min: "Минимум", max: "Максимум", uniq: "Уникальных значений" };
export const CHART_LABEL: Record<ChartType, [string, string]> = {
  kpi: ["Показатель", "Gauge"], bar: ["Столбцы", "BarChart3"], hbar: ["Полосы", "BarChartHorizontal"], line: ["Линия", "LineChart"],
  area: ["Область", "AreaChart"], pie: ["Круговая", "PieChart"], table: ["Таблица", "Table"],
};

export function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млрд`;
  if (a >= 1e6) return `${(v / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  if (a >= 1e4) return `${(v / 1e3).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс.`;
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

let idc = 0;
export const uid = () => `w${Date.now().toString(36)}${(idc++).toString(36)}`;

/** Автодашборд: подбирает 4–8 виджетов по типам колонок. */
export function autoWidgets(ds: Dataset): Widget[] {
  const nums = ds.columns.filter(c => c.type === "number" && !/(^id$|инн|огрн|код|телефон|phone|индекс)/i.test(c.name));
  const dates = ds.columns.filter(c => c.type === "date");
  const cats = ds.columns.filter(c => c.type === "text" && c.unique > 1 && c.unique <= Math.max(50, ds.rows.length * 0.3) && c.empty < ds.rows.length * 0.5)
    .sort((a, b) => a.unique - b.unique);
  const main = nums[0];
  const w: Widget[] = [];
  w.push({ id: uid(), title: "Строк в данных", type: "kpi", agg: "count", limit: 10, sort: "value" });
  nums.slice(0, 3).forEach(n => w.push({ id: uid(), title: `${n.name}: сумма`, type: "kpi", measure: n.name, agg: "sum", limit: 10, sort: "value" }));
  if (dates[0]) w.push({ id: uid(), title: main ? `${main.name} по месяцам` : "Записей по месяцам", type: "area", dim: dates[0].name, dateGrain: "month", measure: main?.name, agg: main ? "sum" : "count", limit: 60, sort: "label" });
  cats.slice(0, 3).forEach((c, i) => w.push({
    id: uid(), title: main ? `${main.name} по «${c.name}»` : `Записей по «${c.name}»`, type: i === 1 && c.unique <= 8 ? "pie" : "hbar",
    dim: c.name, measure: main?.name, agg: main ? "sum" : "count", limit: 12, sort: "value",
  }));
  if (cats[0] && nums[1]) w.push({ id: uid(), title: `${nums[1].name}: среднее по «${cats[0].name}»`, type: "bar", dim: cats[0].name, measure: nums[1].name, agg: "avg", limit: 12, sort: "value" });
  return w.slice(0, 9);
}

export function exportCsv(ds: Dataset, rows: Row[]): Blob {
  const head = ds.columns.map(c => c.name);
  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const body = [head.join(";"), ...rows.map(r => head.map(h => esc(r[h])).join(";"))].join("\n");
  return new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" });
}

export function demoDataset(): Dataset {
  const managers = ["Иванов", "Петрова", "Сидоров", "Козлова", "Морозов"];
  const regions = ["Москва", "Санкт-Петербург", "Екатеринбург", "Казань", "Новосибирск", "Пермь"];
  const products = ["Аудит процессов", "ИИ-ассистент", "Интеграция CRM", "Дашборд", "Чат-бот", "Поддержка"];
  const channels = ["Сайт", "Рекомендация", "Яндекс Директ", "Холодный звонок", "Выставка"];
  const raw: Record<string, unknown>[] = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1200; i++) {
    const m = Math.floor(rnd() * 18);
    const d = new Date(2025, m, 1 + Math.floor(rnd() * 27));
    const p = Math.floor(rnd() * products.length);
    const amount = Math.round((40000 + rnd() * 400000 * (p + 1) / 3) / 1000) * 1000;
    raw.push({
      "Дата": d.toISOString().slice(0, 10), "Менеджер": managers[Math.floor(rnd() ** 1.4 * managers.length)], "Регион": regions[Math.floor(rnd() ** 1.6 * regions.length)],
      "Продукт": products[p], "Канал": channels[Math.floor(rnd() ** 1.3 * channels.length)], "Сумма сделки": amount,
      "Маржа": Math.round(amount * (0.25 + rnd() * 0.3)), "Статус": rnd() < 0.7 ? "Оплачено" : rnd() < 0.6 ? "Счёт выставлен" : "Отказ",
    });
  }
  return buildDataset("Демо: продажи 2025–2026", raw);
}
