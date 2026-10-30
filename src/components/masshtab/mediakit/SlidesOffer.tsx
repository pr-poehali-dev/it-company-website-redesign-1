import Icon from "@/components/ui/icon";
import { serif } from "../MShell";
import { FORMATS, PACKAGES, PARTNER_GETS, PARTNER_STEPS, SPECIALS, START_STEPS } from "./data";
import { Frame } from "./Frame";

export function SlideFormats() {
  return (
    <Frame n={6} kicker="Форматы и цены" title="Форматы размещения">
      <div className="grid grid-cols-3 gap-5 mt-7">
        {FORMATS.map((f) => (
          <div key={f.t} className="bg-white border border-[#e2d9cb] rounded-lg p-5 flex flex-col">
            <div className="flex items-center gap-3"><Icon name={f.icon} size={24} className="text-[#d6402b]" /><div className="font-bold text-[20px] leading-tight">{f.t}</div></div>
            <p className="text-[16px] text-[#5b5550] mt-2 leading-snug flex-1">{f.d}</p>
            <div className="text-[22px] font-extrabold text-[#d6402b] mt-3">{f.p}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function SlidePartner() {
  return (
    <Frame n={7} kicker="Партнёрский материал" title="Как мы делаем материал о вашей компании">
      <div className="grid grid-cols-5 gap-3 mt-7">
        {PARTNER_STEPS.map((s, i) => (
          <div key={s.t} className="bg-white border border-[#e2d9cb] rounded-lg p-4">
            <div className={`${serif} font-bold text-[34px] text-[#d6402b] leading-none`}>{i + 1}</div>
            <div className="font-bold text-[18px] mt-2 leading-tight">{s.t}</div>
            <p className="text-[15px] text-[#5b5550] mt-1 leading-snug">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 bg-[#14110f] text-white rounded-lg p-6 flex-1">
        <div className="text-[20px] font-bold text-white">Что вы получаете</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4">
          {PARTNER_GETS.map((g) => (
            <div key={g} className="flex items-center gap-3 text-[18px] text-white/90"><Icon name="Check" size={22} className="text-[#d6402b] shrink-0" />{g}</div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function SlideSpecials() {
  return (
    <Frame n={8} kicker="Спецпроекты и рейтинг" title="Больше, чем баннер">
      <div className="grid grid-cols-2 gap-5 mt-8">
        {SPECIALS.map((s) => (
          <div key={s.t} className="bg-white border border-[#e2d9cb] rounded-lg p-6 flex gap-5">
            <div className="w-14 h-14 rounded-lg bg-[#efe7da] flex items-center justify-center text-[#d6402b] shrink-0"><Icon name={s.icon} size={28} /></div>
            <div>
              <div className="font-bold text-[22px] leading-tight">{s.t}</div>
              <p className="text-[17px] text-[#5b5550] mt-2 leading-snug">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-auto text-[17px] text-[#5b5550]">Стоимость — по запросу, зависит от объёма и сроков.</p>
    </Frame>
  );
}

export function SlidePackages() {
  return (
    <Frame n={9} kicker="Пакеты" title="Готовые пакеты размещения">
      <div className="grid grid-cols-3 gap-5 mt-7">
        {PACKAGES.map((p) => (
          <div key={p.t} className={`rounded-lg p-6 flex flex-col ${p.accent ? "bg-[#14110f] text-white" : "bg-white border border-[#e2d9cb] text-[#14110f]"}`}>
            <div className={`${serif} font-bold text-[30px] ${p.accent ? "text-white" : ""}`}>«{p.t}»</div>
            <div className="text-[28px] font-extrabold text-[#d6402b] mt-1">{p.p}</div>
            <ul className="mt-4 space-y-2 flex-1">
              {p.items.map((it) => (
                <li key={it} className={`flex items-start gap-2 text-[17px] ${p.accent ? "text-white/90" : "text-[#14110f]"}`}><Icon name="Check" size={20} className="text-[#d6402b] shrink-0 mt-0.5" />{it}</li>
              ))}
            </ul>
            <div className={`mt-4 text-[15px] font-bold ${p.accent ? "text-white/70" : "text-[#5b5550]"}`}>{p.note}</div>
          </div>
        ))}
      </div>
      <p className="mt-auto text-[14px] text-[#8a8278]">Стартовые цены на период запуска журнала. Все рекламные материалы маркируются в соответствии с законом о рекламе (ERID).</p>
    </Frame>
  );
}

export function SlideStart() {
  return (
    <Frame n={10} kicker="Как начать" title="Запуск — за 3 рабочих дня" dark>
      <div className="grid grid-cols-3 gap-5 mt-8">
        {START_STEPS.map((s, i) => (
          <div key={s.t} className="border border-white/20 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <Icon name={s.icon} size={30} className="text-[#d6402b]" />
              <div className={`${serif} font-bold text-[36px] text-white/30`}>{i + 1}</div>
            </div>
            <div className="font-bold text-[22px] mt-4 text-white">{s.t}</div>
            <p className="text-[17px] text-white/70 mt-1">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between">
        <div>
          <div className="text-[18px] text-white/60">Оставьте заявку</div>
          <div className={`${serif} font-bold text-[48px] text-white leading-tight`}>mat-labs.ru/masshtab/reklama</div>
        </div>
        <div className="bg-[#d6402b] text-white font-bold text-[18px] rounded px-6 py-3">Ответим в течение рабочего дня</div>
      </div>
    </Frame>
  );
}
