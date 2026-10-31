import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Kicker, serif } from "./MShell";

export default function PromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => undefined);
    setStarted(true);
  };

  return (
    <section className="mt-8 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-6 md:gap-10 bg-[#14110f] text-white rounded-lg p-4 md:p-8">
      <div className="relative w-full aspect-square max-w-[520px] mx-auto overflow-hidden rounded bg-black">
        <video
          ref={ref}
          src="/video/masshtab-promo.mp4"
          poster="/video/masshtab-promo-poster.jpg"
          preload="none"
          playsInline
          controls={started}
          onEnded={() => setStarted(false)}
          className="w-full h-full object-cover"
        />
        {!started && (
          <button
            type="button"
            onClick={play}
            aria-label="Смотреть ролик о журнале «Масштаб»"
            className="group absolute inset-0 flex items-end justify-center pb-6 md:pb-8 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          >
            <span className="flex items-center gap-3 rounded-full bg-[#d6402b] group-hover:bg-[#b8331f] text-white pl-4 pr-6 py-3 font-bold shadow-lg transition-colors">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Icon name="Play" size={18} />
              </span>
              Смотреть · 15 сек
            </span>
          </button>
        )}
      </div>
      <div>
        <Kicker className="text-[#ff7a66]">Ролик о журнале</Kicker>
        <h2 className={`${serif} font-bold text-3xl md:text-4xl mt-2 leading-tight`}>Экономика в движении</h2>
        <p className="text-white/70 mt-4">
          Логистика, производство, технологии — «Масштаб» разбирает, как компании растут и на чём зарабатывают. Каждая история проверена цифрами из отчётности.
        </p>
      </div>
    </section>
  );
}
