import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RUBRICS } from "./rubrics";

const NAV: [string, string][] = [["/masshtab", "Главное"], ["/masshtab/obuchenie", "Обучение"], ["/masshtab/500", "Масштаб-500"], ["/masshtab/pechatnyy-nomer", "Печатный номер"], ["/masshtab/citata-dnya", "Цитата дня"], ["/masshtab/o-zhurnale", "О журнале"], ["/masshtab/reklama", "Реклама"]];

export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`font-['Playfair_Display',serif] font-bold tracking-tight ${light ? "text-white" : "text-[#14110f]"} ${className}`}>
      Масштаб<span className="text-[#d6402b]">.</span>
    </span>
  );
}

export default function MShell({ children, active, top }: { children: ReactNode; active?: string; top?: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#14110f] font-['Golos_Text',sans-serif]">
      <header className="bg-[#f6f2ea]/95 backdrop-blur border-b-2 border-[#14110f] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/masshtab" className="flex items-center gap-2.5"><img src="/img/masshtab/logo-96.jpg" alt="" width={40} height={40} className="w-10 h-10 rounded-full" /><Logo className="text-3xl" /></Link>
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
            <Link key={to} to={to} className={`whitespace-nowrap ${active === to ? "text-[#d6402b]" : ""}`}>{label}</Link>
          ))}
        </nav>
        <nav className="border-t border-[#e2d9cb]">
          <div className="max-w-6xl mx-auto px-4 md:px-6 flex gap-5 py-2 text-[13px] overflow-x-auto">
            {RUBRICS.map((r) => (
              <Link key={r.slug} to="/masshtab/rubrika/$rubric" params={{ rubric: r.slug }}
                className={`whitespace-nowrap ${active === r.slug ? "text-[#d6402b] font-semibold" : "text-[#5b5550] hover:text-[#14110f]"}`}>{r.name}</Link>
            ))}
          </div>
        </nav>
      </header>
      {top}
      <main>{children}</main>
      <footer className="bg-[#14110f] text-white/70 mt-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <Logo light className="text-3xl" />
            <p className="mt-3 font-['Playfair_Display',serif] italic text-white/80">Бизнес, деньги и люди — проверено цифрами</p>
          </div>
          <div className="space-y-2">
            <Link to="/masshtab/500" className="block hover:text-white">Рейтинг «Масштаб-500»</Link>
            <Link to="/masshtab/pechatnyy-nomer" className="block hover:text-white">Печатный номер (PDF)</Link>
            <Link to="/masshtab/citata-dnya" className="block hover:text-white">Цитата дня</Link>
            <Link to="/masshtab/obuchenie" className="block hover:text-white">Обучение для руководителей</Link>
            <Link to="/masshtab/reklama" className="block hover:text-white">Реклама и спецпроекты</Link>
            <Link to="/masshtab/reklama" hash="hero" className="block hover:text-white">Предложить героя интервью</Link>
            <Link to="/masshtab/o-zhurnale" className="block hover:text-white">Редакционные принципы и источники</Link>
          </div>
          <div className="text-xs leading-relaxed text-white/50">
            Деловой информационный листок. Новости — ТАСС, показатели — Банк России, данные о компаниях — бухгалтерская отчётность ФНС (ГИР БО).
            Издатель — ООО «МАТ-Лабс» · mat-labs.ru<br />© ООО «МАТ-Лабс», 2026. Перепечатка — только с письменного согласия издателя. 16+
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
