import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { EnrichStats, RunRow, enrichCall } from "./radarEnrichApi";
import { useEnrichRunner } from "./useEnrichRunner";
import EnrichResults from "./EnrichResults";

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 1000) / 10 : 0;
}

function Stat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
      <div className={`text-2xl font-bold ${accent || "text-white"}`}>{typeof value === "number" ? value.toLocaleString("ru-RU") : value}</div>
      <div className="text-xs text-white/50 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-white/35 mt-1">{sub}</div>}
    </div>
  );
}

function Bar({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">{done.toLocaleString("ru-RU")} из {total.toLocaleString("ru-RU")} · {pct(done, total)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(100, pct(done, total))}%` }} />
      </div>
    </div>
  );
}

export default function RadarEnrichModule() {
  const [stats, setStats] = useState<EnrichStats | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([
      enrichCall<EnrichStats & { error?: string }>({ action: "stats" }).catch(() => null),
      enrichCall<{ items?: RunRow[] }>({ action: "runs" }).catch(() => ({ items: [] })),
    ]);
    if (s && !s.error) setStats(s);
    setRuns(r?.items || []);
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => { load(); }, [load]);
  const runner = useEnrichRunner(load);

  const elapsed = runner.totals.startedAt ? Math.max(1, (Date.now() - runner.totals.startedAt) / 60000) : 0;
  const speed = elapsed ? Math.round(runner.totals.batches * 10 / elapsed) : 0;

  async function exportCsv(all: boolean) {
    setExporting(true);
    const r = await enrichCall<{ csv_b64?: string; count?: number }>({ action: "export", all, limit: 20000 }).catch(() => ({}));
    setExporting(false);
    if (!("csv_b64" in r) || !r.csv_b64) return;
    const bin = atob(r.csv_b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `radar-${all ? "vse" : "s-kontaktami"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = stats;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Icon name="Radar" size={22} className="text-violet-400" />Сбор контактов для Радара</h2>
          <p className="text-sm text-white/50 mt-1 max-w-2xl">
            ЕГРЮЛ (руководитель, адрес, статус) → поиск официального сайта в Яндексе → проверка сайта по ИНН или названию с регионом → сбор email и телефонов.
            Найденное сразу появляется в карточках на mat-labs.ru/radar.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCsv(false)} disabled={exporting}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 flex items-center gap-2 disabled:opacity-50">
            <Icon name={exporting ? "Loader2" : "Download"} size={15} className={exporting ? "animate-spin" : ""} />Excel: с контактами
          </button>
          <button onClick={() => exportCsv(true)} disabled={exporting}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 disabled:opacity-50">
            вся база
          </button>
        </div>
      </div>

      {s && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Stat label="компаний в базе" value={s.total} />
            <Stat label="руководитель из ЕГРЮЛ" value={s.with_head} sub={`${pct(s.with_head, s.total)}%`} accent="text-violet-300" />
            <Stat label="найден сайт" value={s.with_site} sub={`из них по ИНН: ${s.site_high}`} accent="text-cyan-300" />
            <Stat label="есть email" value={s.with_email} accent="text-emerald-300" />
            <Stat label="есть телефон" value={s.with_phone} accent="text-emerald-300" />
            <Stat label="ликвидированы" value={s.closed} sub="убраны из работы" accent="text-white/60" />
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <Bar label="Этап 1 · ЕГРЮЛ" done={s.egrul_done} total={s.total} color="bg-violet-500" />
            <Bar label="Этап 2–3 · поиск и проверка сайта" done={s.processed} total={s.total - s.closed} color="bg-cyan-500" />
            <Bar label="Компании 2026 года с контактами" done={s.fresh_contact} total={s.fresh_total} color="bg-emerald-500" />
            <div className="text-xs text-white/40">
              В очереди: {s.queue.toLocaleString("ru-RU")} · на проверке сайтов: {s.verify_queue.toLocaleString("ru-RU")} · обработано за сутки: {Number(s.processed_24h).toLocaleString("ru-RU")}
            </div>
          </div>
        </>
      )}

      <div className={`rounded-2xl p-5 border ${runner.running ? "bg-violet-600/10 border-violet-500/40" : "bg-white/[0.03] border-white/10"}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {!runner.running ? (
              <button onClick={runner.start} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold flex items-center gap-2">
                <Icon name="Play" size={16} />Запустить сбор
              </button>
            ) : (
              <button onClick={runner.stop} className="px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 font-semibold flex items-center gap-2">
                <Icon name="Square" size={14} />Остановить
              </button>
            )}
            <label className="text-sm text-white/60 flex items-center gap-2">
              Потоков
              <select value={runner.threads} onChange={e => runner.setThreads(Number(e.target.value))} disabled={runner.running}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white [&>option]:bg-[#12121f]">
                {[2, 3, 5, 8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-sm text-white/60 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={runner.onlyFresh} onChange={e => runner.setOnlyFresh(e.target.checked)} disabled={runner.running} className="accent-violet-500" />
              Сначала только получатели 2026 года
            </label>
          </div>
          {runner.totals.startedAt && (
            <div className="flex gap-5 text-sm">
              <span className="text-white/60">пачек: <b className="text-white">{runner.totals.batches}</b></span>
              <span className="text-white/60">ЕГРЮЛ: <b className="text-violet-300">+{runner.totals.egrul}</b></span>
              <span className="text-white/60">сайтов: <b className="text-cyan-300">+{runner.totals.sites}</b></span>
              <span className="text-white/60">email: <b className="text-emerald-300">+{runner.totals.emails}</b></span>
              <span className="text-white/60">~{speed} комп./мин</span>
            </div>
          )}
        </div>
        {runner.running && <p className="text-xs text-white/45 mt-3">Сбор идёт, пока открыта эта вкладка. Можно закрыть — продолжит ночной запуск автоматизации.</p>}
        {runner.lastError && <p className="text-xs text-amber-300 mt-2">{runner.lastError}</p>}
      </div>

      <EnrichResults refreshKey={refreshKey} />

      {runs.length > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-3">История по часам</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="py-2 font-normal">Час</th><th className="py-2 font-normal">Кто</th><th className="py-2 font-normal">Обработано</th>
                  <th className="py-2 font-normal">ЕГРЮЛ</th><th className="py-2 font-normal">Сайтов</th><th className="py-2 font-normal">Email</th><th className="py-2 font-normal">Телефонов</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 24).map(r => (
                  <tr key={r.hour + r.trigger} className="border-b border-white/5">
                    <td className="py-2 text-white/70">{new Date(r.hour).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2 text-white/50">{r.trigger === "cron" ? "ночной" : r.trigger === "admin" ? "админка" : "вручную"}</td>
                    <td className="py-2 text-white">{Number(r.processed).toLocaleString("ru-RU")}</td>
                    <td className="py-2 text-violet-300">{Number(r.head).toLocaleString("ru-RU")}</td>
                    <td className="py-2 text-cyan-300">{r.site}</td>
                    <td className="py-2 text-emerald-300">{r.email}</td>
                    <td className="py-2 text-emerald-300">{r.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
