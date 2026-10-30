import { useState } from "react";
import Icon from "@/components/ui/icon";
import { MESSAGES, POSTS, SEGMENT_POSTS, TIPS, type TcPost } from "./texts";

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => undefined);
  };
  return (
    <button onClick={copy} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${ok ? "bg-emerald-500/20 text-emerald-300" : "bg-white text-black hover:bg-white/85"}`}>
      <Icon name={ok ? "Check" : "Copy"} size={13} />{ok ? "Скопировано" : "Копировать"}
    </button>
  );
}

function PostList({ title, list, open, setOpen }: { title: string; list: TcPost[]; open: string; setOpen: (v: string) => void }) {
  return (
    <section>
      <h3 className="text-white font-semibold mb-3">{title} · {list.length}</h3>
      <div className="space-y-2">
        {list.map((p, i) => {
          const text = p.text.replace("{url}", p.url);
          const isOpen = open === p.id;
          return (
            <div key={p.id} className="bg-white/[0.03] border border-white/10 rounded-xl">
              <button onClick={() => setOpen(isOpen ? "" : p.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <span className="w-7 h-7 shrink-0 rounded-full bg-white/10 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-medium truncate">{p.title}</span>
                  <span className="block text-xs text-white/40">{p.audience} · {text.length} знаков</span>
                </span>
                <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/40" />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="whitespace-pre-line text-sm text-white/80 leading-relaxed bg-black/30 rounded-lg p-4 max-h-[420px] overflow-y-auto">{text}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyBtn text={text} />
                    <a href={p.url} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/10 text-white/80 hover:bg-white/15">
                      <Icon name="ExternalLink" size={13} />Статья
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function TenchatTab() {
  const [open, setOpen] = useState<string>(POSTS[0].id);
  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-4">
        <div className="text-white font-semibold">Продвижение журнала в TenChat</div>
        <p className="text-sm text-white/50 mt-1">Готовые посты по лучшим разборам «Масштаба» и сценарий личных сообщений руководителям из базы рекламодателей. Скопируйте текст и вставьте в TenChat.</p>
        <ul className="mt-3 grid md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-white/60">
          {TIPS.map((t) => <li key={t} className="flex gap-2"><Icon name="Check" size={13} className="text-cyan-300 mt-0.5 shrink-0" />{t}</li>)}
        </ul>
      </div>

      <PostList title="Посты по лучшим статьям" list={POSTS} open={open} setOpen={setOpen} />
      <PostList title="Посты под платёжеспособные сегменты" list={SEGMENT_POSTS} open={open} setOpen={setOpen} />

      <section>
        <h3 className="text-white font-semibold mb-1">Личные сообщения руководителям</h3>
        <p className="text-xs text-white/40 mb-3">Замените поля в [квадратных скобках]. Имя руководителя и тему компании берите из вкладки «Рекламодатели».</p>
        <div className="grid lg:grid-cols-3 gap-3">
          {MESSAGES.map((m) => (
            <div key={m.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col">
              <div className="text-white font-medium">{m.title}</div>
              <div className="text-[11px] text-white/40 mt-0.5 mb-3">{m.when}</div>
              <div className="whitespace-pre-line text-sm text-white/80 leading-relaxed flex-1">{m.text}</div>
              <div className="mt-3"><CopyBtn text={m.text} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
