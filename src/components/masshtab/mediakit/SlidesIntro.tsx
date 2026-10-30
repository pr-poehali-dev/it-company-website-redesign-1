import Icon from "@/components/ui/icon";
import { Kicker, Logo, serif } from "../MShell";
import { growthLabel, mln, type RatingResp } from "../api";
import { ABOUT, CONCERNS, READERS, SEGMENTS, SITE_LABEL, SOURCES, STATIC_STATS } from "./data";
import { Frame, H, W } from "./Frame";

export function SlideCover() {
  return (
    <div className="mk-slide relative overflow-hidden bg-[#f6f2ea] text-[#14110f] font-['Golos_Text',sans-serif] flex" style={{ width: W, height: H }}>
      <div className="flex-1 flex flex-col justify-between p-16">
        <Kicker className="!text-sm">Деловой журнал · {SITE_LABEL}</Kicker>
        <div>
          <Logo className="text-[150px] leading-none" />
          <div className={`${serif} text-[56px] font-bold mt-6`}>Медиакит 2026</div>
          <p className="text-[26px] text-[#5b5550] mt-5 max-w-[720px] leading-snug">Деловой журнал для собственников и руководителей малого и среднего бизнеса</p>
        </div>
        <div className={`${serif} italic text-[24px]`}>Бизнес, деньги и люди — проверено цифрами</div>
      </div>
      <div className="w-[300px] bg-[#14110f] flex flex-col justify-end p-10">
        <div className="w-16 h-2 bg-[#d6402b] mb-6" />
        <div className="text-white/70 text-lg leading-relaxed">Реклама, партнёрские материалы и спецпроекты</div>
        <div className="text-white font-bold text-lg mt-6">{SITE_LABEL}</div>
      </div>
    </div>
  );
}

export function SlideAbout() {
  return (
    <Frame n={2} kicker="О журнале" title="Деловые медиа, где каждая цифра проверяема">
      <div className="grid grid-cols-3 gap-5 mt-8">
        {ABOUT.map((a) => (
          <div key={a.t} className="bg-white border border-[#e2d9cb] rounded-lg p-5">
            <div className="flex items-center gap-3 text-[#d6402b]"><Icon name={a.icon} size={26} /><div className="font-bold text-[21px] text-[#14110f]">{a.t}</div></div>
            <p className="text-[17px] text-[#5b5550] mt-2 leading-snug">{a.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto bg-[#efe7da] rounded-lg px-6 py-5 flex items-center gap-5">
        <Icon name="BadgeCheck" size={30} className="text-[#d6402b] shrink-0" />
        <div className="text-[19px]"><b>Принцип редакции:</b> каждая цифра — со ссылкой на источник: {SOURCES.join(", ")}.</div>
      </div>
    </Frame>
  );
}

export function SlideNumbers({ rating }: { rating: RatingResp | null }) {
  const s = rating?.stats;
  const dyn = s && s.companies > 0 ? [
    { v: s.companies.toLocaleString("ru-RU"), l: "компаний в рейтинге «Масштаб-500»" },
    { v: mln(s.revenue), l: "их общая выручка" },
    { v: growthLabel(s.median), l: "медианный рост за 3 года" },
  ] : [];
  return (
    <Frame n={3} kicker="Журнал в цифрах" title="Масштаб в цифрах">
      {dyn.length > 0 && (
        <div className="grid grid-cols-3 gap-6 mt-8">
          {dyn.map((x) => (
            <div key={x.l} className="bg-[#14110f] text-white rounded-lg p-7">
              <div className={`${serif} font-bold text-[54px] leading-none text-white`}>{x.v}</div>
              <div className="text-[19px] text-white/70 mt-3">{x.l}</div>
            </div>
          ))}
        </div>
      )}
      <div className={`grid grid-cols-3 gap-6 ${dyn.length ? "mt-6" : "mt-12"}`}>
        {STATIC_STATS.map((x) => (
          <div key={x.l} className={`bg-white border border-[#e2d9cb] rounded-lg ${dyn.length ? "p-7" : "p-10"}`}>
            <div className={`${serif} font-bold ${dyn.length ? "text-[46px]" : "text-[64px]"} leading-none text-[#d6402b]`}>{x.v}</div>
            <div className="text-[19px] text-[#5b5550] mt-3">{x.l}</div>
          </div>
        ))}
      </div>
      <p className="mt-auto text-[15px] text-[#8a8278]">Данные рейтинга — бухгалтерская отчётность ФНС (ГИР БО), обновляются автоматически.</p>
    </Frame>
  );
}

export function SlideReaders() {
  return (
    <Frame n={4} kicker="Наши читатели" title="Для тех, кто принимает решения">
      <div className="grid grid-cols-4 gap-5 mt-8">
        {READERS.map((r) => (
          <div key={r.t} className="bg-white border border-[#e2d9cb] rounded-lg p-6">
            <Icon name={r.icon} size={32} className="text-[#d6402b]" />
            <div className="font-bold text-[21px] mt-4 leading-tight">{r.t}</div>
            <p className="text-[16px] text-[#5b5550] mt-2 leading-snug">{r.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <div className="text-[18px] font-bold">Что их волнует:</div>
        <div className="flex flex-wrap gap-3 mt-3">
          {CONCERNS.map((c) => <span key={c} className="bg-[#efe7da] text-[#14110f] rounded-full px-5 py-2 text-[18px] font-semibold">{c}</span>)}
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3 text-[19px]">
        <Icon name="MapPin" size={24} className="text-[#d6402b]" /><span><b>География:</b> вся Россия, акцент на регионы</span>
      </div>
    </Frame>
  );
}

export function SlideSegments() {
  return (
    <Frame n={5} kicker="Рекламодателям" title="Кому подходит реклама в «Масштабе»">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-8">
        {SEGMENTS.map((s) => (
          <div key={s.t} className="flex items-center gap-4 bg-white border border-[#e2d9cb] rounded-lg px-5 py-3.5">
            <div className="w-11 h-11 rounded-full bg-[#efe7da] flex items-center justify-center text-[#d6402b] shrink-0"><Icon name={s.icon} size={22} /></div>
            <div className="text-[19px] font-semibold">{s.t}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
