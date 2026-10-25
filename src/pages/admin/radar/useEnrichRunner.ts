import { useCallback, useEffect, useRef, useState } from "react";
import { enrichCall, Stage } from "./radarEnrichApi";

export interface RunnerTotals {
  batches: number;
  egrul: number;
  sites: number;
  emails: number;
  phones: number;
  failed: number;
  startedAt: number | null;
}

const EMPTY: RunnerTotals = { batches: 0, egrul: 0, sites: 0, emails: 0, phones: 0, failed: 0, startedAt: null };

const PLAN: Stage[] = ["verify", "search", "verify", "search", "egrul"];

export function useEnrichRunner(onTick: () => void) {
  const [running, setRunning] = useState(false);
  const [threads, setThreads] = useState(5);
  const [onlyFresh, setOnlyFresh] = useState(false);
  const [totals, setTotals] = useState<RunnerTotals>(EMPTY);
  const [lastError, setLastError] = useState("");
  const stopRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const worker = useCallback(async (id: number, fresh: boolean) => {
    let i = id;
    let idle = 0;
    while (!stopRef.current) {
      const stage = PLAN[i % PLAN.length];
      i++;
      try {
        const r = await enrichCall<{ ok?: boolean; claimed?: number; done?: number; site?: number; email?: number; phone?: number; error?: string; errorMessage?: string; limit_hit?: boolean }>(
          { action: stage, size: 10, only_fresh: fresh, trigger: "admin" }, abortRef.current?.signal);
        if (!r.ok) {
          setTotals(t => ({ ...t, failed: t.failed + 1 }));
          if (r.error) setLastError(r.error);
          await new Promise(res => setTimeout(res, 1500));
          continue;
        }
        if (r.limit_hit) setLastError("Суточный лимит DaData исчерпан — ЕГРЮЛ продолжится завтра, поиск сайтов идёт дальше");
        idle = r.claimed ? 0 : idle + 1;
        setTotals(t => ({
          ...t,
          batches: t.batches + 1,
          egrul: t.egrul + (stage === "egrul" ? r.done || 0 : 0),
          sites: t.sites + (r.site || 0),
          emails: t.emails + (r.email || 0),
          phones: t.phones + (r.phone || 0),
        }));
        if (idle >= PLAN.length * 2) {
          stopRef.current = true;
          setLastError("Очередь пуста — все компании обработаны");
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setTotals(t => ({ ...t, failed: t.failed + 1 }));
        await new Promise(res => setTimeout(res, 2000));
      }
    }
  }, []);

  const start = useCallback(async () => {
    if (running) return;
    stopRef.current = false;
    abortRef.current = new AbortController();
    setLastError("");
    setTotals({ ...EMPTY, startedAt: Date.now() });
    setRunning(true);
    await Promise.all(Array.from({ length: threads }, (_, k) => worker(k, onlyFresh)));
    setRunning(false);
    onTick();
  }, [running, threads, onlyFresh, worker, onTick]);

  const stop = useCallback(() => {
    stopRef.current = true;
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(onTick, 8000);
    return () => clearInterval(t);
  }, [running, onTick]);

  useEffect(() => () => { stopRef.current = true; abortRef.current?.abort(); }, []);

  return { running, threads, setThreads, onlyFresh, setOnlyFresh, totals, lastError, start, stop };
}
