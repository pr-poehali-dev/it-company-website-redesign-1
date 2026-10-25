import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { EnrichRow, enrichCall } from "./radarEnrichApi";

const FILTERS = [
  { id: "contact", label: "С контактами" },
  { id: "site", label: "Найден сайт" },
  { id: "empty", label: "Не нашли" },
  { id: "closed", label: "Ликвидированы" },
];

const fmtMoney = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)} млн` : `${Math.round(n / 1e3)} тыс.`;

export default function EnrichResults({ refreshKey }: { refreshKey: number }) {
  const [filter, setFilter] = useState("contact");
  const [rows, setRows] = useState<EnrichRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await enrichCall<{ items?: EnrichRow[] }>({ action: "recent", filter }).catch(() => ({ items: [] }));
    setRows(r.items || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="font-semibold text-white">Последние результаты</h3>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs ${filter === f.id ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:text-white"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {loading && !rows.length ? (
        <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
      ) : !rows.length ? (
        <div className="text-sm text-white/40 py-8 text-center">Пока пусто</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="py-2 pr-3 font-normal">Компания</th>
                <th className="py-2 pr-3 font-normal">Руководитель</th>
                <th className="py-2 pr-3 font-normal">Сайт</th>
                <th className="py-2 pr-3 font-normal">Email</th>
                <th className="py-2 pr-3 font-normal">Телефон</th>
                <th className="py-2 font-normal">Примечание</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.inn} className="border-b border-white/5 align-top">
                  <td className="py-2.5 pr-3">
                    <a href={`/radar/${r.inn}`} target="_blank" rel="noreferrer" className="text-white hover:text-violet-300 font-medium">{r.name}</a>
                    <div className="text-white/40 mt-0.5">{r.region} · {fmtMoney(r.total_amount)} ₽</div>
                  </td>
                  <td className="py-2.5 pr-3 text-white/75">
                    {r.head || "—"}
                    {r.head_post && <div className="text-white/35">{r.head_post}</div>}
                  </td>
                  <td className="py-2.5 pr-3">
                    {r.website ? (
                      <a href={`https://${r.website}`} target="_blank" rel="noreferrer nofollow" className="text-cyan-300 hover:underline inline-flex items-center gap-1">
                        {r.website}
                        <span title={r.website_confidence === "high" ? "ИНН найден на сайте" : "Совпали название и регион"}
                          className={`w-1.5 h-1.5 rounded-full ${r.website_confidence === "high" ? "bg-emerald-400" : "bg-amber-400"}`} />
                      </a>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-white/75 break-all max-w-[200px]">{r.emails || "—"}</td>
                  <td className="py-2.5 pr-3 text-white/75 max-w-[160px]">{r.phones || "—"}</td>
                  <td className="py-2.5 text-white/40 max-w-[180px]">{r.enrich_note || r.contacts_source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-4 mt-3 text-[11px] text-white/40">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />ИНН найден на сайте — точно их сайт</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />совпали название, регион и домен</span>
        <button onClick={load} className="ml-auto flex items-center gap-1 hover:text-white"><Icon name="RefreshCw" size={11} />Обновить</button>
      </div>
    </div>
  );
}
