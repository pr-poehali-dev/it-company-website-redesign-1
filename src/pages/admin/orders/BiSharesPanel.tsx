import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { SHARE_URL } from "@/components/bi/shareApi";
import { fmtDT } from "./ordersApi";

interface Share {
  id: string; title: string; rows_count: number; cols_count: number; size_bytes: number;
  owner_name: string; owner_email: string; owner_phone: string; owner_company: string;
  views: number; last_view_at: string | null; status: string; created_at: string; updated_at: string;
}

function token() {
  return localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
}

export default function BiSharesPanel() {
  const [items, setItems] = useState<Share[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${SHARE_URL}/?action=list`, { headers: { "X-Session-Token": token() } })
      .then(r => r.json()).then(d => setItems(d.items || [])).catch(() => setItems([]));
  }, []);

  const active = (items || []).filter(i => i.status === "active");
  const hot = active.filter(i => i.views >= 3);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 p-4 text-left">
        <Icon name="LayoutDashboard" size={18} className="text-cyan-300" />
        <div className="flex-1">
          <div className="text-white font-semibold">Облачный BI: опубликованные дашборды</div>
          <div className="text-xs text-white/50">{items == null ? "Загрузка…" : `${active.length} активных · ${hot.length} с 3+ просмотрами — тёплые лиды на BI под ключ`}</div>
        </div>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/40" />
      </button>
      {open && items && (
        <div className="border-t border-white/5 p-4 overflow-x-auto">
          {!items.length ? <p className="text-sm text-white/50">Пока никто не публиковал дашборды.</p> : (
            <table className="w-full text-sm min-w-[760px]">
              <thead><tr className="text-left text-xs text-white/40"><th className="py-1.5 pr-3 font-normal">Дашборд</th><th className="py-1.5 pr-3 font-normal">Автор</th><th className="py-1.5 pr-3 font-normal text-right">Просмотры</th><th className="py-1.5 pr-3 font-normal">Опубликован</th><th className="py-1.5 font-normal"></th></tr></thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id} className={`border-t border-white/5 ${s.status !== "active" ? "opacity-40" : ""}`}>
                    <td className="py-2 pr-3"><div className="text-white">{s.title}</div><div className="text-[11px] text-white/40">{s.rows_count.toLocaleString("ru-RU")} строк · {s.cols_count} колонок · {Math.round(s.size_bytes / 1024)} КБ</div></td>
                    <td className="py-2 pr-3 text-white/70">
                      <div>{s.owner_name}{s.owner_company ? ` · ${s.owner_company}` : ""}</div>
                      <div className="text-[11px] flex gap-2"><a href={`mailto:${s.owner_email}`} className="text-violet-300">{s.owner_email}</a>{s.owner_phone && <a href={`tel:${s.owner_phone}`} className="text-white/50">{s.owner_phone}</a>}</div>
                    </td>
                    <td className={`py-2 pr-3 text-right ${s.views >= 3 ? "text-emerald-300 font-semibold" : "text-white/60"}`}>{s.views}<div className="text-[10px] text-white/35 font-normal">{s.last_view_at ? fmtDT(s.last_view_at) : ""}</div></td>
                    <td className="py-2 pr-3 text-white/50 text-xs">{fmtDT(s.created_at)}{s.status !== "active" && " · снят"}</td>
                    <td className="py-2">{s.status === "active" && <a href={`/analytics/bi/s/${s.id}`} target="_blank" rel="noreferrer" className="text-violet-300 hover:text-white"><Icon name="ExternalLink" size={15} /></a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
