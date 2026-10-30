import Icon from "@/components/ui/icon";
import { Kicker, serif } from "./MShell";

export const DZEN_URL = "https://dzen.ru/mat-labs.ru";

function DzenMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-[#14110f] text-white ${className}`} aria-hidden>
      <Icon name="Sparkle" size={20} fallback="Star" />
    </span>
  );
}

export default function DzenSubscribe({ variant = "wide" }: { variant?: "wide" | "side" }) {
  if (variant === "side") {
    return (
      <div className="bg-white border border-[#e2d9cb] rounded-lg p-5">
        <div className="flex items-center gap-3">
          <DzenMark className="w-10 h-10 shrink-0" />
          <div>
            <Kicker>Мы в Дзене</Kicker>
            <div className={`${serif} font-bold text-lg leading-snug mt-0.5`}>«Масштаб» в вашей ленте</div>
          </div>
        </div>
        <p className="text-sm text-[#5b5550] mt-3">Разборы, кейсы и цифры недели — в рекомендациях Дзена, без поиска по сайту.</p>
        <a
          href={DZEN_URL}
          target="_blank"
          rel="noopener"
          className="mt-4 flex items-center justify-center gap-2 bg-[#14110f] text-white font-bold rounded px-4 py-2.5 text-sm hover:bg-[#d6402b] transition-colors"
        >
          Подписаться на канал
          <Icon name="ArrowUpRight" size={16} />
        </a>
      </div>
    );
  }

  return (
    <section className="mt-12 bg-[#14110f] text-white rounded-lg p-6 md:p-8 font-['Golos_Text',sans-serif]">
      <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
        <DzenMark className="w-14 h-14 shrink-0 !bg-white !text-[#14110f]" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#e8836f]">Мы в Дзене</div>
          <h2 className={`${serif} font-bold text-2xl md:text-3xl mt-1 leading-tight`}>Подпишитесь на «Масштаб» в Дзене</h2>
          <p className="text-white/70 mt-2">Новые разборы, учебные кейсы и цифры недели будут сами приходить в вашу ленту. Один клик — и вы с нами.</p>
        </div>
        <a
          href={DZEN_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center gap-2 bg-[#d6402b] text-white font-bold rounded px-6 py-3.5 hover:bg-[#b93522] transition-colors shrink-0"
        >
          Подписаться
          <Icon name="ArrowUpRight" size={18} />
        </a>
      </div>
    </section>
  );
}