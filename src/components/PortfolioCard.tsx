import { useState } from "react";
import Icon from "@/components/ui/icon";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { portfolioDetails, type PortfolioDetail } from "@/lib/portfolioDetails";

export interface PortfolioItem {
  title: string;
  category: string;
  desc: string;
  tech: string[];
  color: string;
  url: string;
  icon: string;
}

function DetailBody({ p, d }: { p: PortfolioItem; d: PortfolioDetail }) {
  return (
    <div className="space-y-4 text-left">
      <div>
        <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${p.color} mb-3`} />
        <p className="font-oswald text-lg font-semibold text-white leading-snug">{d.tagline}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Какую задачу решает</p>
        <p className="text-sm text-white/75 leading-relaxed">{d.problem}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Возможности</p>
        <ul className="space-y-1.5">
          {d.features.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-white/80 leading-snug">
              <Icon name="Check" size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Для кого</p>
          <p className="text-xs text-white/80 leading-snug">{d.audience}</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Формат</p>
          <p className="text-xs text-white/80 leading-snug">{d.format}</p>
        </div>
      </div>

      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-semibold text-white bg-gradient-to-r ${p.color} hover:opacity-90 transition-opacity`}
      >
        Открыть проект
        <Icon name="ExternalLink" size={14} />
      </a>
    </div>
  );
}

export default function PortfolioCard({ p }: { p: PortfolioItem }) {
  const d = portfolioDetails[p.title];
  const [open, setOpen] = useState(false);

  const card = (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className="block h-full">
      <div className="glass neon-border rounded-2xl p-6 card-hover group cursor-pointer h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <img src={p.icon} alt={p.title} loading="lazy" className={`w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 bg-gradient-to-br ${p.color} flex-shrink-0`} />
          <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${p.color} text-white font-medium`}>{p.category}</span>
        </div>
        <h3 className="font-oswald text-lg font-semibold mb-2 text-white">{p.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed mb-4">{p.desc}</p>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex gap-2 flex-wrap">
            {p.tech.map((t) => (
              <span key={t} className="glass border border-white/10 text-white/60 text-xs px-2 py-1 rounded-lg">{t}</span>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-1 text-violet-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
            <span>Открыть</span>
            <Icon name="ExternalLink" size={12} />
          </div>
        </div>
      </div>
    </a>
  );

  if (!d) return card;

  return (
    <div className="h-full flex flex-col">
      <div className="hidden md:block h-full">
        <HoverCard openDelay={250} closeDelay={150}>
          <HoverCardTrigger asChild>
            <div className="h-full">{card}</div>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            sideOffset={12}
            collisionPadding={16}
            className="w-[340px] rounded-2xl border border-white/10 bg-[#0f0f1f]/95 backdrop-blur-xl p-5 text-white shadow-2xl shadow-violet-900/30"
          >
            <DetailBody p={p} d={d} />
          </HoverCardContent>
        </HoverCard>
      </div>

      <div className="md:hidden h-full flex flex-col">
        {card}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 flex items-center justify-center gap-1.5 text-sm text-violet-300 py-2"
          aria-expanded={open}
        >
          {open ? "Скрыть описание" : "Подробнее о проекте"}
          <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} />
        </button>
        {open && (
          <div className="glass neon-border rounded-2xl p-5">
            <DetailBody p={p} d={d} />
          </div>
        )}
      </div>
    </div>
  );
}
