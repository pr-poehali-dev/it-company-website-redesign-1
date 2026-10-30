import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Segment, n, btnGhost, btnPrimary } from "./api";

interface Props {
  segments: Segment[];
  busy: string;
  enriching: boolean;
  onBuild: (segment: string) => void;
  onEnrich: (segment: string) => void;
  onSend: (step: 1 | 2, segment: string, count: number) => void;
}

export default function SegmentsPanel({ segments, busy, enriching, onBuild, onEnrich, onSend }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const disabled = !!busy;

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {segments.map(s => {
        const cnt = counts[s.code] ?? 10;
        const due = n(s.followup_due);
        return (
          <div key={s.code} className="glass neon-border rounded-2xl p-4 space-y-3 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="text-white font-semibold leading-snug">{s.name}</div>
              {n(s.replied) > 0 && <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">ответили {n(s.replied)}</span>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {([["В базе", n(s.total)], ["С почтой", n(s.with_email)], ["Отправлено", n(s.sent)]] as const).map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/5 py-2">
                  <div className="text-lg font-bold text-white">{v}</div>
                  <div className="text-[11px] text-white/40">{l}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-white/40">
              С телефоном: {n(s.with_phone)} · ждут поиска контактов: {n(s.to_enrich)}
            </div>
            <div className="flex flex-wrap gap-2 mt-auto">
              <button onClick={() => onBuild(s.code)} disabled={disabled} className={btnGhost}>
                <Icon name={busy === `build-${s.code}` ? "Loader2" : "DatabaseZap"} size={14} className={busy === `build-${s.code}` ? "animate-spin" : ""} fallback="Database" />
                Собрать базу +200
              </button>
              <button onClick={() => onEnrich(s.code)} disabled={disabled || enriching} className={btnGhost}>
                <Icon name="SearchCheck" size={14} fallback="Search" />Найти контакты
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" min={1} max={200} value={cnt}
                onChange={e => setCounts({ ...counts, [s.code]: Math.max(1, Number(e.target.value) || 1) })}
                className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-cyan-400" />
              <button onClick={() => onSend(1, s.code, cnt)} disabled={disabled || n(s.with_email) === 0} className={btnPrimary}>
                <Icon name={busy === `send-1-${s.code}` ? "Loader2" : "Send"} size={14} className={busy === `send-1-${s.code}` ? "animate-spin" : ""} />
                Отправить {cnt} писем
              </button>
              {due > 0 && (
                <button onClick={() => onSend(2, s.code, due)} disabled={disabled} className={btnGhost}>
                  <Icon name={busy === `send-2-${s.code}` ? "Loader2" : "BellRing"} size={14} className={busy === `send-2-${s.code}` ? "animate-spin" : ""} />
                  Напоминание ({due})
                </button>
              )}
            </div>
          </div>
        );
      })}
      {segments.length === 0 && <div className="text-sm text-white/40">Сегменты не найдены.</div>}
    </div>
  );
}
