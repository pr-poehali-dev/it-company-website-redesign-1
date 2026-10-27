import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { api, ago, num, type Run, type Source } from "./pipesApi";

const TRIGGER: Record<string, string> = { manual: "вручную", schedule: "по расписанию" };

export default function RunHistory({ source, onClose }: { source: Source; onClose: () => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ runs: Run[] }>("runs", { id: String(source.id) }, "GET").then(r => (r.error ? setErr(r.error) : setRuns(r.runs)));
  }, [source.id]);
  const ok = runs?.filter(r => r.status === "ok").length || 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-xl h-full bg-[#0d0d18] border-l border-white/10 overflow-y-auto">
        <div className="sticky top-0 bg-[#0d0d18] border-b border-white/10 px-5 py-4 flex items-center gap-3 z-10">
          <Icon name="History" size={20} className="text-violet-300" />
          <div className="flex-1 min-w-0"><div className="font-semibold text-white truncate">История загрузок</div><div className="text-xs text-white/45 truncate">{source.name}</div></div>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={20} /></button>
        </div>
        <div className="p-5">
          {err && <p className="text-rose-300 text-sm">{err}</p>}
          {!runs && !err && <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}</div>}
          {runs && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-5">
                <Box v={String(runs.length)} l="запусков" />
                <Box v={runs.length ? `${Math.round((ok / runs.length) * 100)}%` : "—"} l="успешных" />
                <Box v={num(runs.reduce((a, r) => a + (r.dupes || 0), 0))} l="дублей удалено" />
              </div>
              {!runs.length && <p className="text-sm text-white/50">Загрузок ещё не было — нажмите «Обновить сейчас».</p>}
              <div className="space-y-2">
                {runs.map(r => (
                  <div key={r.id} className={`rounded-xl border p-3.5 ${r.status === "error" ? "border-rose-400/30 bg-rose-500/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name={r.status === "ok" ? "CheckCircle2" : r.status === "error" ? "XCircle" : "Loader2"} size={16}
                        className={r.status === "ok" ? "text-emerald-300" : r.status === "error" ? "text-rose-300" : "text-cyan-300 animate-spin"} />
                      <span className="text-white">{new Date(r.started_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-white/40 text-xs">{TRIGGER[r.trigger] || r.trigger} · {ago(r.started_at)}</span>
                      {r.ms != null && <span className="ml-auto text-xs text-white/40">{(r.ms / 1000).toFixed(1)} с</span>}
                    </div>
                    {r.status === "ok" && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/55">
                        <span>получено <b className="text-white">{num(r.rows_in)}</b></span>
                        <span>сохранено <b className="text-white">{num(r.rows_out)}</b></span>
                        {!!r.dupes && <span>дублей <b className="text-amber-200">{num(r.dupes)}</b></span>}
                        {!!r.empty_rows && <span>пустых <b className="text-white/80">{num(r.empty_rows)}</b></span>}
                        {!!r.fixed_values && <span>исправлено значений <b className="text-cyan-200">{num(r.fixed_values)}</b></span>}
                      </div>
                    )}
                    {r.message && <div className={`text-xs mt-1.5 ${r.status === "error" ? "text-rose-200" : "text-white/40"}`}>{r.message}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Box({ v, l }: { v: string; l: string }) {
  return <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3"><div className="font-['Oswald',sans-serif] text-2xl font-bold text-white">{v}</div><div className="text-[11px] text-white/45">{l}</div></div>;
}
