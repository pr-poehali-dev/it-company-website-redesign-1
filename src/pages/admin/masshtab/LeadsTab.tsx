import { useEffect, useState } from "react";
import { M_URL } from "@/components/masshtab/api";

interface Lead { id: number; kind: string; name: string; company: string; contact: string; message: string; created_at: string }
const KIND: Record<string, string> = { ad: "Реклама", hero: "Герой интервью", rating: "Рейтинг", subscribe: "Подписка", report: "Отчёт", corporate: "Корп. подписка", calc: "Калькулятор" };

export default function LeadsTab({ token }: { token: string }) {
  const [list, setList] = useState<Lead[] | null>(null);
  useEffect(() => {
    fetch(`${M_URL}/?action=leads`, { headers: { "X-Session-Token": token } }).then((r) => r.json()).then((d) => setList(d.leads || [])).catch(() => setList([]));
  }, [token]);
  if (!list) return <div className="text-white/40 text-sm">Загрузка…</div>;
  if (!list.length) return <div className="text-white/40 text-sm">Заявок пока нет. Новые заявки также приходят на почту maksT77@yandex.ru.</div>;
  return (
    <div className="space-y-2">
      {list.map((l) => (
        <div key={l.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">{KIND[l.kind] || l.kind}</span>
            <b>{l.company || l.name || "Без имени"}</b>{l.name && l.company ? <span className="text-white/50">{l.name}</span> : null}
            <a href={l.contact.includes("@") ? `mailto:${l.contact}` : `tel:${l.contact}`} className="text-cyan-300">{l.contact}</a>
            <span className="ml-auto text-xs text-white/40">{new Date(l.created_at).toLocaleString("ru-RU")}</span>
          </div>
          {l.message && <p className="text-sm text-white/70 mt-2 whitespace-pre-line">{l.message}</p>}
        </div>
      ))}
    </div>
  );
}
