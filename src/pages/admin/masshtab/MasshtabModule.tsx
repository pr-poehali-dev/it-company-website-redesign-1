import { useState } from "react";
import Icon from "@/components/ui/icon";
import PostsTab from "./PostsTab";
import AdsTab from "./AdsTab";
import LeadsTab from "./LeadsTab";
import QuotesTab from "./QuotesTab";

type Tab = "posts" | "quotes" | "ads" | "leads";

export default function MasshtabModule({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>("posts");
  const tabs: [Tab, string, string][] = [["posts", "Материалы", "Newspaper"], ["quotes", "Цитата дня", "Quote"], ["ads", "Реклама", "BadgeRussianRuble"], ["leads", "Заявки", "Inbox"]];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Журнал «Масштаб»</h1>
          <p className="text-white/50 text-sm">Публикация интервью, рекламные места и заявки рекламодателей и героев</p>
        </div>
        <a href="/masshtab" target="_blank" rel="noopener" className="text-sm text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5">
          <Icon name="ExternalLink" size={14} /> Открыть листок
        </a>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${tab === id ? "bg-white text-black font-semibold" : "bg-white/5 text-white/60 hover:text-white"}`}>
            <Icon name={icon} size={15} fallback="Circle" />{label}
          </button>
        ))}
      </div>
      {tab === "posts" && <PostsTab token={token} />}
      {tab === "quotes" && <QuotesTab token={token} />}
      {tab === "ads" && <AdsTab token={token} />}
      {tab === "leads" && <LeadsTab token={token} />}
    </div>
  );
}
