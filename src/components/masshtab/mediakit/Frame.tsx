import { type ReactNode } from "react";
import { Kicker, Logo, serif } from "../MShell";
import { SITE_LABEL } from "./data";

export const W = 1280;
export const H = 720;
export const TOTAL = 10;

export function Frame({ n, kicker, title, children, dark = false }: { n: number; kicker?: string; title?: string; children: ReactNode; dark?: boolean }) {
  return (
    <div className={`mk-slide relative overflow-hidden flex flex-col font-['Golos_Text',sans-serif] ${dark ? "bg-[#14110f] text-white" : "bg-[#f6f2ea] text-[#14110f]"}`} style={{ width: W, height: H }}>
      <div className={`flex items-center justify-between mx-16 pt-10 pb-4 border-b-2 ${dark ? "border-white/20" : "border-[#14110f]"}`}>
        <Logo light={dark} className="text-2xl" />
        <div className={`text-sm font-semibold ${dark ? "text-white/60" : "text-[#5b5550]"}`}>Медиакит 2026 · {String(n).padStart(2, "0")}/{TOTAL}</div>
      </div>
      <div className="flex-1 flex flex-col px-16 pt-8 pb-12 min-h-0">
        {kicker && <Kicker className="!text-sm">{kicker}</Kicker>}
        {title && <h2 className={`${serif} font-bold text-[52px] leading-[1.05] mt-2`}>{title}</h2>}
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
      <div className={`absolute bottom-4 left-16 text-xs ${dark ? "text-white/40" : "text-[#8a8278]"}`}>{SITE_LABEL}</div>
    </div>
  );
}