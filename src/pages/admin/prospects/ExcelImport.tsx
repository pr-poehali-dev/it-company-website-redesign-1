import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/icon";
import { PROSPECTS_URL, Project } from "./types";

interface ImportRow {
  company_name: string;
  inn?: string;
  phone?: string;
  email?: string;
  website?: string;
  region?: string;
  address?: string;
  industry?: string;
  note?: string;
}

interface Props {
  token: string;
  projects: Project[];
  onDone: () => void;
}

const COL_MAP: Record<string, keyof ImportRow> = {
  "название": "company_name", "компания": "company_name", "наименование": "company_name", "company": "company_name", "company_name": "company_name",
  "инн": "inn", "inn": "inn",
  "телефон": "phone", "phone": "phone", "тел": "phone",
  "email": "email", "почта": "email", "e-mail": "email",
  "сайт": "website", "website": "website",
  "регион": "region", "region": "region", "город": "region",
  "адрес": "address", "address": "address",
  "отрасль": "industry", "industry": "industry", "сфера": "industry",
  "заметка": "note", "note": "note", "комментарий": "note",
};

export default function ExcelImport({ token, projects, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [targetProject, setTargetProject] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (raw.length < 2) { setError("Файл пустой или содержит только заголовки"); return; }

        const headers = (raw[0] as string[]).map(h => String(h).toLowerCase().trim());
        const parsed: ImportRow[] = [];

        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as string[];
          const obj: Partial<ImportRow> = {};
          headers.forEach((h, idx) => {
            const field = COL_MAP[h];
            if (field && row[idx]) obj[field] = String(row[idx]).trim();
          });
          if (obj.company_name) parsed.push(obj as ImportRow);
        }

        setRows(parsed);
      } catch {
        setError("Не удалось прочитать файл. Проверьте формат (xlsx, xls, csv).");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  async function doImport() {
    if (!rows.length) return;
    setLoading(true);
    setError("");
    try {
      const contacts = rows.map(r => ({
        ...r,
        source: "manual",
        project_id: targetProject ? Number(targetProject) : null,
      }));
      const res = await fetch(`${PROSPECTS_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "bulk_create", contacts }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка импорта"); return; }
      setResult({ imported: data.imported || 0, skipped: data.skipped || 0 });
      setRows([]);
      setFileName("");
      onDone();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRows([]); setFileName(""); setResult(null); setError(""); setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 hover:border-green-500/40 text-white/70 hover:text-white text-sm transition-all"
      >
        <Icon name="FileSpreadsheet" size={14} className="text-green-400" />
        Импорт Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass neon-border rounded-2xl p-6 w-full max-w-lg space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <Icon name="FileSpreadsheet" size={18} className="text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Импорт из Excel</h3>
                  <p className="text-xs text-white/40">xlsx, xls, csv</p>
                </div>
              </div>
              <button onClick={reset} className="text-white/30 hover:text-white transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Формат */}
            <div className="glass border border-white/5 rounded-xl p-3 text-xs text-white/40 space-y-1">
              <p className="text-white/60 font-medium mb-1.5">Ожидаемые колонки в файле:</p>
              <div className="flex flex-wrap gap-1.5">
                {["Название / Компания *", "ИНН", "Телефон", "Email", "Сайт", "Регион", "Адрес", "Отрасль", "Заметка"].map(c => (
                  <span key={c} className={`px-2 py-0.5 rounded-md ${c.includes("*") ? "bg-green-500/15 text-green-300" : "bg-white/5"}`}>{c}</span>
                ))}
              </div>
            </div>

            {/* Файл */}
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-green-500/40 rounded-xl p-6 text-center cursor-pointer transition-all group"
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              {fileName ? (
                <div className="space-y-1">
                  <Icon name="FileCheck" size={28} className="text-green-400 mx-auto" />
                  <p className="text-white text-sm font-medium">{fileName}</p>
                  <p className="text-white/40 text-xs">{rows.length} строк найдено</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Icon name="Upload" size={28} className="text-white/20 mx-auto group-hover:text-green-400 transition-colors" />
                  <p className="text-white/40 text-sm">Нажмите для выбора файла</p>
                </div>
              )}
            </div>

            {/* Проект */}
            {rows.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-white/40">Добавить в проект (необязательно)</label>
                <select
                  value={targetProject}
                  onChange={e => setTargetProject(e.target.value ? Number(e.target.value) : "")}
                  className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-transparent focus:outline-none focus:border-violet-500/50"
                >
                  <option value="">— Без проекта —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {/* Превью */}
            {rows.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {rows.slice(0, 8).map((r, i) => (
                  <div key={i} className="glass border border-white/5 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                    <span className="text-white/30 w-4">{i + 1}</span>
                    <span className="text-white flex-1 truncate">{r.company_name}</span>
                    {r.inn && <span className="text-white/30 font-mono">{r.inn}</span>}
                    {r.phone && <span className="text-white/40">{r.phone}</span>}
                  </div>
                ))}
                {rows.length > 8 && (
                  <p className="text-xs text-white/30 text-center py-1">...и ещё {rows.length - 8} строк</p>
                )}
              </div>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            {result && (
              <div className="flex items-center gap-3 text-sm">
                <Icon name="CheckCircle" size={16} className="text-green-400" />
                <span className="text-green-300">Импортировано: <strong>{result.imported}</strong></span>
                {result.skipped > 0 && <span className="text-white/40">Пропущено дублей: {result.skipped}</span>}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-white/60 hover:text-white text-sm transition-all">
                Отмена
              </button>
              <button
                onClick={doImport}
                disabled={!rows.length || loading}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Upload" size={14} />}
                {loading ? "Загружаю..." : `Загрузить ${rows.length} контактов`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
