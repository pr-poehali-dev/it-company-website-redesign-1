import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { DEADLINE_DAY, PRINT_NOTE, nextIssue } from "./issues";

export default function IssueDeadline({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const [next, setNext] = useState<ReturnType<typeof nextIssue> | null>(null);
  useEffect(() => {
    const n = new Date();
    setNext(nextIssue({ y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }));
  }, []);
  const box = dark ? "bg-white/5 border-white/15 text-white" : "bg-white border-[#e2d9cb] text-[#14110f]";
  const muted = dark ? "text-white/65" : "text-[#5b5550]";
  return (
    <div className={`border rounded-lg p-5 ${box}`}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-10 h-10 rounded-full bg-[#d6402b] text-white flex items-center justify-center"><Icon name="CalendarClock" size={20} /></span>
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#d6402b]">Выходит ежемесячно</div>
          <div className="font-bold text-lg leading-snug mt-1">
            {next ? <>Следующий номер — № {next.number}, {next.month}</> : "Следующий номер"}
          </div>
          <p className={`text-sm mt-1.5 ${muted}`}>
            Материалы, рекламу и правки в номер принимаем до {DEADLINE_DAY} числа предыдущего месяца
            {next ? <> — <b className={dark ? "text-white" : "text-[#14110f]"}>до {next.deadline} включительно</b></> : null}. Всё, что пришло позже, переносится в следующий выпуск. Вышедшие номера не меняются.
          </p>
          {!compact && <p className={`text-xs mt-2 ${muted}`}>{PRINT_NOTE}</p>}
        </div>
      </div>
    </div>
  );
}
