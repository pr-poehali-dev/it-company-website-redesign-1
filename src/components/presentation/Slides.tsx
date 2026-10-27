import type { ReactNode } from "react";
import Icon from "@/components/ui/icon";
import { portfolio } from "@/components/shared";
import { AI_FLOW, AI_PACKS, CONTACTS, DATA_FACTS, DATA_PRODUCTS, DIRECTIONS, GUARANTEES, IMG, PAINS, STEPS } from "./deckData";

export function Frame({ children, n, total, bg, className = "" }: { children: ReactNode; n: number; total: number; bg?: string; className?: string }) {
  return (
    <section className={`deck-slide relative w-[1280px] h-[720px] overflow-hidden bg-[#07070f] text-white ${className}`}>
      {bg && <img src={bg} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-violet-600/25 blur-[120px]" />
      <div className="absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full bg-cyan-500/20 blur-[130px]" />
      <div className="absolute inset-0 deck-grid opacity-[0.07]" />
      <div className="relative h-full px-[72px] py-[56px] flex flex-col">{children}</div>
      {n > 1 && (
        <div className="absolute bottom-6 left-[72px] right-[72px] flex items-center justify-between text-[12px] text-white/35 tracking-wide">
          <span className="font-semibold text-white/50">МАТ-ЛАБС · {CONTACTS.site}</span>
          <span>{String(n).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        </div>
      )}
    </section>
  );
}

const Tag = ({ children }: { children: ReactNode }) => (
  <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 text-[13px] font-medium text-violet-200 mb-5">
    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />{children}
  </div>
);

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="font-['Oswald',sans-serif] text-[52px] leading-[1.05] font-bold tracking-tight">{children}</h2>
);

const Grad = ({ children }: { children: ReactNode }) => (
  <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{children}</span>
);

export function Cover({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total} bg={IMG.cover}>
      <div className="absolute inset-0 -mx-[72px] -my-[56px] bg-gradient-to-r from-[#07070f] via-[#07070f]/85 to-transparent" />
      <div className="relative flex-1 flex flex-col justify-center max-w-[720px]">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center font-['Oswald',sans-serif] font-bold text-lg">M</div>
          <div className="font-['Oswald',sans-serif] text-xl font-semibold tracking-wider">МАТ-ЛАБС</div>
        </div>
        <h1 className="font-['Oswald',sans-serif] text-[76px] leading-[0.98] font-bold tracking-tight">
          Ваш бизнес<br />работает <Grad>быстрее</Grad>,<br />чем конкуренты
        </h1>
        <p className="text-[22px] text-white/70 mt-7 leading-snug max-w-[600px]">
          Внедряем AI, автоматизацию и аналитику, которые убирают рутину, ловят каждую заявку и показывают, где ваши деньги.
        </p>
        <div className="flex gap-3 mt-10">
          {["AI-ассистенты 24/7", "Первый результат за 7–14 дней", "Фиксированная цена"].map(t => (
            <span key={t} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-[14px] backdrop-blur">{t}</span>
          ))}
        </div>
      </div>
      <div className="relative text-[13px] text-white/45">Коммерческое предложение · 2026</div>
    </Frame>
  );
}

export function Pains({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total}>
      <Tag>Знакомо?</Tag>
      <H>Бизнес растёт, а <Grad>хаос растёт быстрее</Grad></H>
      <div className="grid grid-cols-3 gap-6 mt-12 flex-1 items-start">
        {PAINS.map(p => (
          <div key={p.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 h-[300px] flex flex-col">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center mb-6"><Icon name={p.icon} size={26} className="text-rose-300" /></div>
            <div className="font-['Oswald',sans-serif] text-[44px] font-bold leading-none">{p.value}</div>
            <div className="text-[20px] font-semibold text-white/90 mt-2">{p.title}</div>
            <p className="text-[16px] text-white/55 mt-4 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
      <p className="text-[20px] text-white/80 mb-6">Итог: вы платите зарплату за рутину и теряете клиентов, которые <span className="text-cyan-300 font-semibold">уже хотели купить</span>.</p>
    </Frame>
  );
}

export function Approach({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total} bg={IMG.people}>
      <div className="absolute inset-0 -mx-[72px] -my-[56px] bg-gradient-to-l from-[#07070f] via-[#07070f]/90 to-[#07070f]/20" />
      <div className="relative ml-auto max-w-[620px] flex-1 flex flex-col justify-center">
        <Tag>Наш подход</Tag>
        <H>Рутину — <Grad>машинам</Grad>.<br />Людям — клиентов и рост.</H>
        <div className="mt-10 space-y-5">
          {[
            ["Zap", "Автоматизируем то, что повторяется", "Заявки, ответы, документы, отчёты — без участия сотрудников"],
            ["Link2", "Связываем всё в одну систему", "Сайт, мессенджеры, CRM, 1С и почта работают как единый поток"],
            ["Gauge", "Даём руководителю цифры", "Дашборд в реальном времени вместо отчётов в пятницу вечером"],
          ].map(([i, t, d]) => (
            <div key={t} className="flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"><Icon name={i} size={22} /></div>
              <div><div className="text-[20px] font-semibold">{t}</div><div className="text-[16px] text-white/60 mt-0.5">{d}</div></div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function Directions({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total}>
      <Tag>Что мы делаем</Tag>
      <H>6 направлений — <Grad>одна команда</Grad></H>
      <div className="grid grid-cols-3 gap-5 mt-10">
        {DIRECTIONS.map(d => (
          <div key={d.title} className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 h-[200px] flex flex-col overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${d.accent}`} />
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${d.accent} flex items-center justify-center`}><Icon name={d.icon} size={21} /></div>
              <div className="text-[20px] font-semibold">{d.title}</div>
            </div>
            <p className="text-[15px] text-white/60 mt-3 leading-snug flex-1">{d.desc}</p>
            <div className="flex items-end justify-between">
              <span className="font-['Oswald',sans-serif] text-[22px] font-semibold">{d.price}</span>
              <span className="text-[13px] text-white/45">{d.term}</span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function AiFlow({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total}>
      <Tag>AI-автоматизация · флагман</Tag>
      <H>Ни одна заявка <Grad>не теряется</Grad> — даже ночью</H>
      <div className="flex items-stretch gap-3 mt-12">
        {AI_FLOW.map((s, i) => (
          <div key={s.title} className="flex items-center gap-3 flex-1">
            <div className="flex-1 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 h-[210px] flex flex-col">
              <div className="text-[12px] text-cyan-300 font-semibold mb-3">ШАГ {i + 1}</div>
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mb-4"><Icon name={s.icon} size={22} className="text-violet-200" /></div>
              <div className="text-[18px] font-semibold leading-tight">{s.title}</div>
              <div className="text-[14px] text-white/55 mt-2 leading-snug">{s.desc}</div>
            </div>
            {i < AI_FLOW.length - 1 && <Icon name="ChevronRight" size={22} className="text-violet-300/60 shrink-0" />}
          </div>
        ))}
      </div>
      <div className="mt-auto mb-8 grid grid-cols-3 gap-5">
        {[["24/7", "отвечаем клиентам без выходных"], ["0", "потерянных заявок между каналами"], ["1 экран", "вся воронка перед руководителем"]].map(([v, l]) => (
          <div key={l} className="flex items-baseline gap-3">
            <span className="font-['Oswald',sans-serif] text-[40px] font-bold whitespace-nowrap bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">{v}</span>
            <span className="text-[16px] text-white/60">{l}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function AiPacks({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total}>
      <Tag>Пакеты автоматизации</Tag>
      <H>Начните с малого — <Grad>масштабируйте</Grad> по результату</H>
      <div className="grid grid-cols-3 gap-6 mt-10 flex-1 mb-10">
        {AI_PACKS.map(p => (
          <div key={p.name} className={`relative rounded-3xl p-8 flex flex-col ${p.hot ? "bg-gradient-to-b from-violet-600/40 to-cyan-600/20 border-2 border-violet-400/60 shadow-[0_0_60px_-10px_rgba(139,92,246,.6)]" : "border border-white/10 bg-white/[0.04]"}`}>
            {p.hot && <span className="absolute -top-3.5 left-8 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-[12px] font-semibold">Выбирают чаще всего</span>}
            <div className="text-[22px] font-semibold">{p.name}</div>
            <div className="font-['Oswald',sans-serif] text-[40px] font-bold mt-3 leading-none">{p.price}</div>
            <div className="text-[14px] text-white/50 mt-2">Запуск за {p.term}</div>
            <div className="h-px bg-white/10 my-6" />
            <ul className="space-y-3">
              {p.items.map(i => <li key={i} className="flex gap-2.5 text-[16px] text-white/80"><Icon name="CheckCircle2" size={19} className="text-cyan-300 shrink-0 mt-0.5" />{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function Data({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total} bg={IMG.data}>
      <div className="absolute inset-0 -mx-[72px] -my-[56px] bg-gradient-to-r from-[#07070f] via-[#07070f]/92 to-[#07070f]/40" />
      <div className="relative">
        <Tag>Бизнес-аналитика</Tag>
        <H>Решения на <Grad>данных</Grad>,<br />а не на ощущениях</H>
      </div>
      <div className="relative grid grid-cols-2 gap-x-10 gap-y-4 mt-8 max-w-[760px]">
        {DATA_PRODUCTS.map(p => (
          <div key={p.title} className="flex gap-3.5">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center"><Icon name={p.icon} size={20} className="text-cyan-200" /></div>
            <div><div className="text-[18px] font-semibold">{p.title}</div><div className="text-[14px] text-white/60 leading-snug">{p.desc}</div></div>
          </div>
        ))}
      </div>
      <div className="relative grid grid-cols-4 gap-4 mt-auto mb-8">
        {DATA_FACTS.map(f => (
          <div key={f.label} className="rounded-2xl border border-white/10 bg-[#0c0c1a]/80 backdrop-blur p-4">
            <div className="font-['Oswald',sans-serif] text-[34px] font-bold text-cyan-200 leading-none">{f.value}</div>
            <div className="text-[13px] text-white/60 mt-2 leading-snug">{f.label}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function Cases({ n, total }: { n: number; total: number }) {
  const list = portfolio.slice(0, 8);
  return (
    <Frame n={n} total={total}>
      <Tag>Наши продукты</Tag>
      <div className="flex items-end justify-between">
        <H>{portfolio.length}+ запущенных <Grad>AI-продуктов</Grad></H>
        <p className="text-[16px] text-white/55 max-w-[340px] text-right mb-2">Мы не только делаем на заказ — мы сами строим и запускаем продукты. Всё работает, можно открыть.</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-9">
        {list.map(p => (
          <div key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 h-[200px] flex flex-col">
            <div className="flex items-center gap-3">
              <img src={p.icon} alt="" crossOrigin="anonymous" className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/15" />
              <div className="min-w-0"><div className="text-[16px] font-semibold truncate">{p.title}</div><div className="text-[12px] text-violet-300 truncate">{p.category}</div></div>
            </div>
            <p className="text-[13px] text-white/60 mt-3 leading-snug line-clamp-4 flex-1">{p.desc}</p>
            <div className="text-[12px] text-cyan-300/80 truncate">{p.url.replace(/^https?:\/\//, "")}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function Process({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total}>
      <Tag>Как мы работаем</Tag>
      <H>От звонка до результата — <Grad>без сюрпризов</Grad></H>
      <div className="relative mt-14">
        <div className="absolute top-[30px] left-[30px] right-[30px] h-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 rounded-full" />
        <div className="grid grid-cols-5 gap-5 relative">
          {STEPS.map(s => (
            <div key={s.n}>
              <div className="w-[62px] h-[62px] rounded-2xl bg-[#0d0d1c] border-2 border-violet-400/70 flex items-center justify-center font-['Oswald',sans-serif] text-[22px] font-bold shadow-[0_0_30px_-5px_rgba(139,92,246,.7)]">{s.n}</div>
              <div className="text-[19px] font-semibold mt-6">{s.title}</div>
              <div className="text-[15px] text-white/55 mt-2 leading-snug min-h-[66px]">{s.desc}</div>
              <div className="inline-block mt-3 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/25 text-[13px] text-cyan-200">{s.time}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto mb-8 grid grid-cols-3 gap-5">
        {[
          ["CalendarCheck", "Первый результат", "уже на 1–2 неделе — работающий сценарий, а не презентация"],
          ["Wallet", "Цена фиксируется", "в договоре до старта — никаких «а ещё нужно доплатить»"],
          ["Users", "Один менеджер", "на весь проект — всегда знаете, кому позвонить"],
        ].map(([i, t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex gap-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center"><Icon name={i} size={20} className="text-violet-200" /></div>
            <div><div className="text-[17px] font-semibold">{t}</div><div className="text-[14px] text-white/55 leading-snug mt-0.5">{d}</div></div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function Guarantees({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total}>
      <Tag>Почему нам доверяют</Tag>
      <H>Вы рискуете <Grad>только временем</Grad> на разговор</H>
      <div className="flex gap-8 mt-8 items-center">
        <div className="flex-1 grid grid-cols-2 gap-4">
          {GUARANTEES.map(g => (
            <div key={g.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 h-[164px] flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center"><Icon name={g.icon} size={23} className="text-emerald-200" /></div>
              <div>
                <div className="text-[21px] font-semibold">{g.title}</div>
                <div className="text-[16px] text-white/60 mt-2 leading-relaxed">{g.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="w-[250px] shrink-0 flex flex-col items-center">
          <div tabIndex={0} className="relative z-10 w-[212px] cursor-zoom-in outline-none transition-transform duration-500 ease-out origin-right hover:z-30 hover:scale-[1.85] focus:z-30 focus:scale-[1.85]">
            <img src={IMG.certificate} alt="Сертификат партнёра Точка Банка" className="w-full rounded-xl ring-1 ring-white/20 shadow-[0_20px_60px_-10px_rgba(124,58,237,.7)]" />
          </div>
          <div className="mt-4 text-center">
            <div className="text-[15px] font-semibold">Партнёр Точка Банка</div>
            <div className="deck-hint text-[12px] text-white/45 mt-0.5">наведите, чтобы увеличить</div>
          </div>
        </div>
      </div>
      <div className="mt-auto mb-8 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-7 py-5 flex items-center gap-4">
        <Icon name="MapPin" size={22} className="text-violet-200" />
        <span className="text-[17px] text-white/80">ООО «МАТ-Лабс», Самара. Работаем с компаниями по всей России удалённо — встречи онлайн, доступы настраиваем сами.</span>
      </div>
    </Frame>
  );
}

export function Cta({ n, total }: { n: number; total: number }) {
  return (
    <Frame n={n} total={total} bg={IMG.cover}>
      <div className="absolute inset-0 -mx-[72px] -my-[56px] bg-[#07070f]/85" />
      <div className="relative flex-1 grid grid-cols-[1fr_300px] gap-14 items-center">
        <div>
          <Tag>Следующий шаг</Tag>
          <h2 className="font-['Oswald',sans-serif] text-[64px] leading-[1.02] font-bold tracking-tight">
            Бесплатный разбор<br />вашего бизнеса <Grad>за 1 час</Grad>
          </h2>
          <p className="text-[20px] text-white/70 mt-6 max-w-[620px]">Покажем, что можно автоматизировать уже в этом месяце, сколько это стоит и как быстро окупится. Без обязательств.</p>
          <div className="grid grid-cols-2 gap-x-10 gap-y-4 mt-10 text-[19px]">
            <div className="flex items-center gap-3"><Icon name="Phone" size={21} className="text-cyan-300" />{CONTACTS.phone}</div>
            <div className="flex items-center gap-3"><Icon name="Send" size={21} className="text-cyan-300" />{CONTACTS.tg}</div>
            <div className="flex items-center gap-3"><Icon name="Mail" size={21} className="text-cyan-300" />{CONTACTS.email}</div>
            <div className="flex items-center gap-3"><Icon name="Globe" size={21} className="text-cyan-300" />{CONTACTS.site}</div>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 text-center shadow-[0_0_80px_-10px_rgba(34,211,238,.5)]">
          <img src="/presentation-qr.png" alt="QR-код на бесплатный разбор" className="w-full aspect-square" />
          <div className="text-[#0b0b1a] text-[15px] font-semibold mt-3">Наведите камеру —<br />опишите задачу AI-консультанту</div>
        </div>
      </div>
    </Frame>
  );
}

export const SLIDES = [Cover, Pains, Approach, Directions, AiFlow, AiPacks, Data, Cases, Process, Guarantees, Cta];