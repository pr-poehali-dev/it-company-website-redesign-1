import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

const NAV: [string, string][] = [["/masshtab", "Главное"], ["/masshtab/500", "Масштаб-500"], ["/masshtab/reklama", "Реклама"]];

export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`font-['Playfair_Display',serif] font-bold tracking-tight ${light ? "text-white" : "text-[#14110f]"} ${className}`}>
      Масштаб<span className="text-[#d6402b]">.</span>
    </span>
  );
}

export default function MShell({ children, active }: { children: ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#14110f] font-['Golos_Text',sans-serif]">
      <header className="bg-[#f6f2ea]/95 backdrop-blur border-b-2 border-[#14110f] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/masshtab"><Logo className="text-3xl" /></Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            {NAV.map(([to, label]) => (
              <Link key={to} to={to} className={active === to ? "text-[#d6402b]" : "hover:text-[#d6402b] transition-colors"}>{label}</Link>
            ))}
          </nav>
          <Link to="/masshtab/reklama" hash="hero" className="text-xs md:text-sm font-bold bg-[#d6402b] text-white px-3 md:px-4 py-2 rounded hover:bg-[#b93522] transition-colors">
            Стать героем
          </Link>
        </div>
        <nav className="md:hidden flex gap-5 px-4 pb-2 text-sm font-semibold overflow-x-auto">
          {NAV.map(([to, label]) => (
            <Link key={to} to={to} className={active === to ? "text-[#d6402b]" : ""}>{label}</Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="bg-[#14110f] text-white/70 mt-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <Logo light className="text-3xl" />
            <p className="mt-3 font-['Playfair_Display',serif] italic text-white/80">Бизнес, деньги и люди — проверено цифрами</p>
          </div>
          <div className="space-y-2">
            <Link to="/masshtab/500" className="block hover:text-white">Рейтинг «Масштаб-500»</Link>
            <Link to="/masshtab/reklama" className="block hover:text-white">Реклама и спецпроекты</Link>
            <Link to="/masshtab/reklama" hash="hero" className="block hover:text-white">Предложить героя интервью</Link>
          </div>
          <div className="text-xs leading-relaxed text-white/50">
            Деловой информационный листок. Данные о компаниях — открытая бухгалтерская отчётность ФНС (ГИР БО).
            Издатель — ООО «МАТ-Лабс» · mat-labs.ru
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#d6402b] ${className}`}>{children}</div>;
}

export const serif = "font-['Playfair_Display',serif]";
