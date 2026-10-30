import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "@/components/masshtab/MShell";
import { MESSAGES, POSTS, SEGMENT_POSTS, type TcPost } from "@/pages/admin/masshtab/tenchat/texts";

const IMG: Record<string, string> = {
  mid: "/files/tenchat/1-sredniy-biznes-2025.jpg",
  m500: "/files/tenchat/2-masshtab-500.jpg",
  coffee: "/files/tenchat/3-reklama-kofeyni.jpg",
  grants: "/files/tenchat/4-granty.jpg",
  tax: "/files/tenchat/5-nalogi-2027.jpg",
  "s-cfo": "/files/tenchat-segmenty/1-cfo-stavka-2027.jpg",
  "s-strat": "/files/tenchat-segmenty/2-strategi-rost-rynka.jpg",
  "s-ceo": "/files/tenchat-segmenty/3-sobstvenniki-arenda-ofisa.jpg",
  "s-digital": "/files/tenchat-segmenty/4-cifra-otchet-bez-excel.jpg",
  "s-invest": "/files/tenchat-segmenty/5-investory-zastroyschiki.jpg",
};

export const Route = createFileRoute("/masshtab/tenchat")({
  head: () => ({ meta: [{ title: "Посты для TenChat — журнал «Масштаб»" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Page,
});

function Copy({ text, label = "Скопировать текст" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  const run = () => {
    navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => undefined);
  };
  return (
    <button onClick={run} className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded transition-colors ${ok ? "bg-emerald-600 text-white" : "bg-[#d6402b] hover:bg-[#b93522] text-white"}`}>
      <Icon name={ok ? "Check" : "Copy"} size={15} />{ok ? "Скопировано" : label}
    </button>
  );
}

function Card({ p, n }: { p: TcPost; n: number }) {
  const text = p.text.replace("{url}", p.url);
  const img = IMG[p.id];
  return (
    <article className="bg-white border border-[#e2d9cb] rounded-lg overflow-hidden grid md:grid-cols-[380px_1fr]">
      <div className="bg-[#0b1a33]">
        {img && <img src={img} alt={p.title} loading="lazy" className="w-full aspect-video object-cover" />}
        <div className="p-4 space-y-2">
          <div className="text-xs text-white/50">Пост {n} · {p.audience}</div>
          <div className="text-white font-bold leading-snug">{p.title}</div>
          {img && (
            <a href={img} download className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-[#14110f] px-3 py-1.5 rounded hover:bg-white/85">
              <Icon name="Download" size={13} />Скачать обложку
            </a>
          )}
        </div>
      </div>
      <div className="p-5 flex flex-col">
        <div className="whitespace-pre-line text-[15px] leading-relaxed text-[#14110f] flex-1">{text}</div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#efe7da]">
          <Copy text={text} />
          <a href={p.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-bold border-2 border-[#14110f] px-4 py-1.5 rounded hover:bg-[#14110f] hover:text-white transition-colors">
            <Icon name="ExternalLink" size={15} />Статья
          </a>
        </div>
      </div>
    </article>
  );
}

function Page() {
  return (
    <MShell>
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8">
        <Kicker>Для публикации в TenChat</Kicker>
        <h1 className={`${serif} font-bold text-4xl md:text-5xl mt-2`}>Посты журнала «Масштаб»</h1>
        <p className="text-[#5b5550] mt-3 max-w-2xl">Скопируйте текст, скачайте обложку и опубликуйте в TenChat. Ссылка на статью уже внутри текста. Ниже — <a href="#soobshcheniya" className="font-bold text-[#d6402b] hover:underline">тексты личных сообщений руководителям</a>.</p>
        <div className="flex flex-wrap gap-3 mt-5">
          <a href="/files/masshtab-tenchat.zip" download className="inline-flex items-center gap-1.5 text-sm font-bold bg-[#14110f] text-white px-4 py-2 rounded hover:bg-[#d6402b]"><Icon name="Archive" size={15} />Архив: лучшие статьи</a>
          <a href="/files/masshtab-tenchat-segmenty.zip" download className="inline-flex items-center gap-1.5 text-sm font-bold bg-[#14110f] text-white px-4 py-2 rounded hover:bg-[#d6402b]"><Icon name="Archive" size={15} />Архив: под сегменты + контент-план</a>
        </div>

        <h2 className={`${serif} font-bold text-3xl mt-12`}>Лучшие статьи</h2>
        <div className="space-y-5 mt-5">{POSTS.map((p, i) => <Card key={p.id} p={p} n={i + 1} />)}</div>

        <h2 className={`${serif} font-bold text-3xl mt-14`}>Под платёжеспособные сегменты</h2>
        <div className="space-y-5 mt-5">{SEGMENT_POSTS.map((p, i) => <Card key={p.id} p={p} n={i + 1} />)}</div>

        <h2 id="soobshcheniya" className={`${serif} font-bold text-3xl mt-14 scroll-mt-24`}>Личные сообщения руководителям</h2>
        <p className="text-[#5b5550] mt-2 max-w-3xl">Замените поля в [квадратных скобках] перед отправкой. Пишите с личного профиля вручную, не больше 15–20 сообщений в день, — TenChat ограничивает массовые рассылки.</p>
        <div className="grid lg:grid-cols-3 gap-5 mt-5">
          {MESSAGES.map((m, i) => (
            <div key={m.id} className="bg-white border border-[#e2d9cb] rounded-lg p-5 flex flex-col">
              <div className="text-xs font-bold uppercase tracking-wider text-[#d6402b]">Шаг {i + 1}</div>
              <div className={`${serif} font-bold text-xl mt-1`}>{m.title}</div>
              <div className="text-xs text-[#8a8278] mt-1">{m.when}</div>
              <div className="whitespace-pre-line text-[15px] leading-relaxed mt-4 flex-1">{m.text}</div>
              <div className="mt-4 pt-4 border-t border-[#efe7da]"><Copy text={m.text} label="Скопировать" /></div>
            </div>
          ))}
        </div>
      </div>
    </MShell>
  );
}
