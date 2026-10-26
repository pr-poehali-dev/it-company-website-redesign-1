import { ReactNode } from "react";
import Icon from "@/components/ui/icon";

export function Kpi({ value, label, sub, accent = "from-violet-300 to-cyan-300" }: { value: ReactNode; label: string; sub?: ReactNode; accent?: string }) {
  return (
    <div className="bg-white/[0.04] border border-violet-500/20 rounded-2xl p-4 md:p-5">
      <div className={`font-['Oswald',sans-serif] text-2xl md:text-3xl font-bold bg-gradient-to-r ${accent} bg-clip-text text-transparent leading-tight`}>{value}</div>
      <div className="text-white/55 text-xs md:text-sm mt-1">{label}</div>
      {sub && <div className="text-white/35 text-[11px] mt-1">{sub}</div>}
    </div>
  );
}

export function Card({ title, icon, children, right, className = "" }: { title?: string; icon?: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`bg-white/[0.03] border border-white/10 rounded-2xl p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-semibold text-white flex items-center gap-2">{icon && <Icon name={icon} size={17} className="text-violet-300" />}{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Locked({ children, onUnlock, label = "Доступно в полном отчёте" }: { children: ReactNode; onUnlock: () => void; label?: string }) {
  return (
    <div className="relative">
      <div className="blur-[5px] select-none pointer-events-none opacity-60" aria-hidden="true">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button onClick={onUnlock} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10101c]/90 border border-violet-500/40 text-sm text-white hover:border-violet-400 shadow-lg">
          <Icon name="Lock" size={14} className="text-violet-300" />{label}
        </button>
      </div>
    </div>
  );
}

export function BarRow({ label, value, max, right, color = "bg-violet-500/70" }: { label: ReactNode; value: number; max: number; right: ReactNode; color?: string }) {
  return (
    <div className="py-1.5">
      <div className="flex justify-between gap-3 text-xs mb-1">
        <span className="text-white/75 truncate">{label}</span>
        <span className="text-white/90 shrink-0">{right}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(1.5, (value / (max || 1)) * 100)}%` }} />
      </div>
    </div>
  );
}

export const INSIGHT_ICON: Record<string, string> = {
  profit: "TrendingUp", conc: "PieChart", new: "Sparkles", risk: "AlertTriangle", geo: "MapPin", grant: "Landmark",
};

export function SourceNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-[11px] text-white/35 leading-relaxed">
      {children || "Источник: открытые данные ФНС России за 2025 год (доходы и расходы по бухгалтерской отчётности, среднесписочная численность, налоговые режимы, недоимки), единый реестр МСП на 10.08.2026, реестр получателей господдержки. Данные приводятся как есть; компании на УСН без бухотчётности могут отсутствовать в расчёте выручки."}
    </p>
  );
}
