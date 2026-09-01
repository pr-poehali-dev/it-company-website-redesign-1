import { useState } from "react";
import Icon from "@/components/ui/icon";
import { LEGAL_URL, LegalDocument, DOC_TYPE_LABELS } from "./types";

export default function DocGenerator({
  token,
  caseId,
  documents,
  onCreated,
}: {
  token: string;
  caseId: number | null;
  documents: LegalDocument[];
  onCreated: () => void;
}) {
  const [docType, setDocType] = useState("claim");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setPreview("");
    try {
      const res = await fetch(LEGAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "legal_doc",
          doc_type: docType,
          case_id: caseId,
          details,
        }),
      });
      const d = await res.json();
      if (d.content) {
        setPreview(d.content);
        onCreated();
      } else {
        setError(d.error || "Не удалось создать документ");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4">
      <div className="glass border border-white/10 rounded-2xl p-5">
        <p className="text-sm text-white/50 mb-3">
          Выберите документ — подготовлю готовый текст со ссылками на нормы права.
          Данные в квадратных скобках замените на свои.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(DOC_TYPE_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setDocType(k)}
              className={`text-xs px-3 py-2 rounded-xl border transition-all ${
                docType === k
                  ? "border-violet-500/50 bg-violet-500/10 text-white"
                  : "glass border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          rows={3}
          placeholder="Дополнительные обстоятельства: номер и дата договора, суммы, что уже сделано..."
          className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-y"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
        >
          {loading ? (
            <>
              <Icon name="Loader2" size={14} className="animate-spin" />
              Составляю документ...
            </>
          ) : (
            <>
              <Icon name="FileText" size={14} />
              Составить документ
            </>
          )}
        </button>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm">
            <Icon name="XCircle" size={15} />
            {error}
          </div>
        )}
      </div>

      {preview && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm">{DOC_TYPE_LABELS[docType]}</h3>
            <button
              onClick={() => copy(preview)}
              className="flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 transition-colors"
            >
              <Icon name={copied ? "Check" : "Copy"} size={13} />
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <pre className="text-sm text-white/75 whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto">
            {preview}
          </pre>
        </div>
      )}

      {documents.length > 0 && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-3 text-sm">
            Документы по делу ({documents.length})
          </h3>
          <div className="space-y-2">
            {documents.map(d => (
              <details key={d.id} className="bg-white/3 border border-white/8 rounded-xl">
                <summary className="px-4 py-3 cursor-pointer text-sm text-white/75 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Icon name="FileText" size={14} className="text-violet-400" />
                    {DOC_TYPE_LABELS[d.doc_type] || d.title}
                  </span>
                  <span className="text-xs text-white/30">
                    {new Date(d.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  <button
                    onClick={() => copy(d.content)}
                    className="text-xs text-violet-300 hover:text-violet-200 mb-2 flex items-center gap-1"
                  >
                    <Icon name="Copy" size={12} /> Копировать текст
                  </button>
                  <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
                    {d.content}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
