import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/icon";
import { PROSPECTS_URL, Project } from "./types";

interface Props {
  token: string;
  projects: Project[];
  onDone: () => void;
}

export default function ExcelImport({ token, projects, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [targetProject, setTargetProject] = useState<number | "">("");
  const [stage, setStage] = useState<"idle" | "preview" | "mapping" | "done">("idle");
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([]);
  const [mappingInfo, setMappingInfo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null); setError(""); setMappedRows([]); setMappingInfo({});

    const reader = new FileReader();
    reader.onerror = () => setError("Не удалось прочитать файл");
    reader.onload = (ev) => {
      // Сбрасываем input только после чтения
      e.target.value = "";
      try {
        const data = ev.target?.result as ArrayBuffer;
        if (!data) { setError("Файл пустой"); return; }

        let wb: XLSX.WorkBook;
        const name = file.name.toLowerCase();
        if (name.endsWith(".csv")) {
          // CSV — пробуем UTF-8, затем Windows-1251
          let text = new TextDecoder("utf-8").decode(data);
          if (text.includes("")) text = new TextDecoder("windows-1251").decode(data);
          wb = XLSX.read(text, { type: "string" });
        } else {
          wb = XLSX.read(data, { type: "array" });
        }

        // Ищем лист с данными — пробуем все листы, берём тот где больше строк с данными
        let bestRaw: string[][] = [];
        let bestSheetName = wb.SheetNames[0];

        for (const sName of wb.SheetNames) {
          const ws = wb.Sheets[sName];
          const r: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as string[][];
          // Считаем непустые строки
          const nonEmpty = r.filter(row => row.some(c => String(c ?? "").trim()));
          if (nonEmpty.length > bestRaw.filter(row => row.some(c => String(c ?? "").trim())).length) {
            bestRaw = r;
            bestSheetName = sName;
          }
        }

        const raw = bestRaw;
        console.log("Выбран лист:", bestSheetName, "строк:", raw.length);

        // Найти первую строку где 2+ непустых ячейки (заголовки)
        let startIdx = 0;
        while (startIdx < raw.length && raw[startIdx].filter(c => String(c ?? "").trim()).length < 2) startIdx++;

        if (startIdx >= raw.length - 1) {
          setError("Файл пустой или не содержит табличных данных");
          return;
        }

        const headers = raw[startIdx].map(h => String(h ?? "").trim()).filter(Boolean);
        if (headers.length === 0) { setError("Не найдены заголовки колонок"); return; }

        const rows: Record<string, string>[] = [];
        for (let i = startIdx + 1; i < raw.length; i++) {
          const r = raw[i];
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const val = String(r[idx] ?? "").trim();
            if (val) obj[h] = val;
          });
          if (Object.keys(obj).length > 0) rows.push(obj);
        }

        if (rows.length === 0) {
          const firstFew = raw.slice(startIdx, startIdx + 5).map(r => r.join(" | ")).join("\n");
          setError(`Строки с данными не найдены.\n\nИспользован лист: ${bestSheetName}\nПервые строки:\n${firstFew || "(пусто)"}`);
          return;
        }

        setRawHeaders(headers);
        setRawRows(rows);
        setStage("preview");
      } catch (err) {
        console.error("Excel parse error:", err);
        setError("Ошибка чтения файла: " + String(err).slice(0, 150));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function doAiMapping() {
    if (!rawRows.length) return;
    setLoading(true); setError("");
    try {
      const sample = rawRows.slice(0, 5);
      const res = await fetch(`${PROSPECTS_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "ai_map_columns", headers: rawHeaders, sample }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Ошибка маппинга"); setLoading(false); return; }
      const mapping: Record<string, string> = data.mapping || {};
      setMappingInfo(mapping);
      const converted = rawRows.map(row => {
        const out: Record<string, string> = {};
        Object.entries(mapping).forEach(([srcCol, targetField]) => {
          if (targetField && row[srcCol] != null) out[targetField] = row[srcCol];
        });
        return out;
      }).filter(r => r["company_name"]);
      setMappedRows(converted);
      setStage("mapping");
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  }

  async function doImport() {
    const rows = mappedRows.length ? mappedRows : rawRows;
    if (!rows.length) return;
    setLoading(true); setError("");
    try {
      const contacts = rows.map(r => ({ ...r, source: "manual", project_id: targetProject ? Number(targetProject) : null }));
      const res = await fetch(`${PROSPECTS_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "bulk_create", contacts }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка импорта"); return; }
      setResult({ imported: data.imported || 0, skipped: data.skipped || 0 });
      setStage("done");
      onDone();
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  }

  function reset() {
    setRawRows([]); setRawHeaders([]); setMappedRows([]); setMappingInfo({});
    setFileName(""); setResult(null); setError(""); setStage("idle"); setOpen(false);
  }

  const FIELD_LABELS: Record<string, string> = {
    company_name: "Название компании", inn: "ИНН", phone: "Телефон",
    email: "Email", website: "Сайт", region: "Регион",
    address: "Адрес", industry: "Отрасль", note: "Заметка",
  };

  const previewRows = mappedRows.length ? mappedRows : rawRows;

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 hover:border-green-500/40 text-white/70 hover:text-white text-sm transition-all">
        <Icon name="FileSpreadsheet" size={14} className="text-green-400" />
        Импорт Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass neon-border rounded-2xl p-6 w-full max-w-xl space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <Icon name="FileSpreadsheet" size={18} className="text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Импорт контактов</h3>
                  <p className="text-xs text-white/40">ИИ автоматически разберёт любой формат файла</p>
                </div>
              </div>
              <button onClick={reset} className="text-white/30 hover:text-white transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Шаг 1: Загрузка файла */}
            {stage === "idle" && (
              <div onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-green-500/40 rounded-xl p-8 text-center cursor-pointer transition-all group">
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.ods" onChange={handleFile} className="hidden" />
                <Icon name="Upload" size={32} className="text-white/20 mx-auto mb-3 group-hover:text-green-400 transition-colors" />
                <p className="text-white/60 text-sm font-medium">Нажмите для выбора файла</p>
                <p className="text-white/30 text-xs mt-1">xlsx, xls, csv — любые колонки</p>
              </div>
            )}

            {/* Шаг 2: Превью файла + запуск маппинга */}
            {stage === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 glass border border-green-500/20 rounded-xl px-4 py-3">
                  <Icon name="FileCheck" size={18} className="text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{fileName}</p>
                    <p className="text-white/40 text-xs">{rawRows.length} строк · {rawHeaders.length} колонок</p>
                  </div>
                  <button onClick={() => { setStage("idle"); setFileName(""); setRawRows([]); }}
                    className="text-white/30 hover:text-white transition-colors flex-shrink-0">
                    <Icon name="X" size={14} />
                  </button>
                </div>

                {/* Колонки из файла */}
                <div className="space-y-2">
                  <p className="text-xs text-white/40">Колонки в файле:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rawHeaders.map(h => (
                      <span key={h} className="px-2 py-0.5 rounded-md bg-white/5 text-white/60 text-xs">{h}</span>
                    ))}
                  </div>
                </div>

                {/* Первые строки */}
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {rawRows.slice(0, 4).map((r, i) => (
                    <div key={i} className="glass border border-white/5 rounded-lg px-3 py-2 text-xs text-white/50 truncate">
                      {Object.entries(r).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </div>
                  ))}
                </div>

                <button onClick={doAiMapping} disabled={loading}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  {loading
                    ? <><Icon name="Loader2" size={14} className="animate-spin" /> ИИ разбирает колонки...</>
                    : <><Icon name="Sparkles" size={14} /> Разобрать через ИИ</>}
                </button>
              </div>
            )}

            {/* Шаг 3: Результат маппинга */}
            {stage === "mapping" && (
              <div className="space-y-4">
                <div className="glass border border-violet-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-white/50 mb-2">ИИ распознал колонки:</p>
                  {Object.entries(mappingInfo).filter(([, v]) => v).map(([src, tgt]) => (
                    <div key={src} className="flex items-center gap-2 text-xs">
                      <span className="text-white/40 flex-1 truncate">{src}</span>
                      <Icon name="ArrowRight" size={10} className="text-violet-400 flex-shrink-0" />
                      <span className="text-violet-300 w-36 truncate">{FIELD_LABELS[tgt] || tgt}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Icon name="CheckCircle" size={12} className="text-green-400" />
                  {mappedRows.length} контактов готово к импорту
                  {rawRows.length - mappedRows.length > 0 && (
                    <span className="text-white/30">· {rawRows.length - mappedRows.length} без названия пропущено</span>
                  )}
                </div>

                {/* Превью */}
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {previewRows.slice(0, 6).map((r, i) => (
                    <div key={i} className="glass border border-white/5 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                      <span className="text-white/30 w-4">{i + 1}</span>
                      <span className="text-white flex-1 truncate">{r.company_name || "—"}</span>
                      {r.inn && <span className="text-white/30 font-mono">{r.inn}</span>}
                      {r.phone && <span className="text-white/40">{r.phone}</span>}
                    </div>
                  ))}
                </div>

                {/* Проект */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40">Добавить в проект (необязательно)</label>
                  <select value={targetProject} onChange={e => setTargetProject(e.target.value ? Number(e.target.value) : "")}
                    className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-transparent focus:outline-none focus:border-violet-500/50">
                    <option value="">— Без проекта —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Шаг 4: Готово */}
            {stage === "done" && result && (
              <div className="text-center py-4 space-y-3">
                <Icon name="CheckCircle" size={40} className="text-green-400 mx-auto" />
                <p className="text-white font-semibold">Импорт завершён</p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="text-green-300">Добавлено: <strong>{result.imported}</strong></span>
                  {result.skipped > 0 && <span className="text-white/40">Пропущено дублей: {result.skipped}</span>}
                </div>
              </div>
            )}

            {error && <pre className="text-red-400 text-xs whitespace-pre-wrap break-words font-sans">{error}</pre>}

            {/* Кнопки */}
            <div className="flex gap-3">
              <button onClick={reset}
                className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-white/60 hover:text-white text-sm transition-all">
                {stage === "done" ? "Закрыть" : "Отмена"}
              </button>
              {stage === "mapping" && (
                <button onClick={doImport} disabled={loading || !mappedRows.length}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Загружаю...</> : <><Icon name="Upload" size={14} /> Загрузить {mappedRows.length}</>}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}