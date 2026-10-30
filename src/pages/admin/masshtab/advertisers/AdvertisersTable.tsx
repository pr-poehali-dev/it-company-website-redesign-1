import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { inp } from "../upload";
import { Advertiser, ENRICH, FILTERS, STATUSES, Segment, advGet, advPost, btnPrimary, fmtDate } from "./api";

interface Props {
  token: string;
  segments: Segment[];
  reloadKey: number;
  busy: string;
  onSendIds: (ids: number[]) => Promise<void>;
}

const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 [&>option]:bg-[#0f1220]";

function fmtRevenue(v: number | null) {
  if (!v) return "";
  const m = Number(v) / 1e6;
  return `${m >= 100 ? Math.round(m).toLocaleString("ru-RU") : m.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₽`;
}

function siteHref(s: string) {
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function EmailCell({ token, item, onSaved }: { token: string; item: Advertiser; onSaved: (email: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(item.email || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const d = await advPost<{ ok: boolean }>(token, "update", { id: item.id, email: val.trim() });
    setSaving(false);
    if (!d.error) { onSaved(val.trim()); setEdit(false); }
  }

  if (edit) {
    return (
      <div className="flex items-center gap-1">
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEdit(false); }}
          className="w-44 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400" />
        <button onClick={save} disabled={saving} className="p-1 rounded text-emerald-300 hover:bg-white/10">
          <Icon name={saving ? "Loader2" : "Check"} size={13} className={saving ? "animate-spin" : ""} />
        </button>
        <button onClick={() => { setVal(item.email || ""); setEdit(false); }} className="p-1 rounded text-white/40 hover:bg-white/10"><Icon name="X" size={13} /></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 group">
      {item.email ? <a href={`mailto:${item.email}`} className="text-cyan-300 hover:text-cyan-200 break-all">{item.email}</a> : <span className="text-white/30">нет почты</span>}
      <button onClick={() => setEdit(true)} className="p-0.5 rounded text-white/30 hover:text-white opacity-60 group-hover:opacity-100">
        <Icon name="Pencil" size={11} />
      </button>
    </div>
  );
}

export default function AdvertisersTable({ token, segments, reloadKey, busy, onSendIds }: Props) {
  const [segment, setSegment] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Advertiser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const segNames = Object.fromEntries(segments.map(s => [s.code, s.name]));

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const d = await advGet<{ items: Advertiser[]; total: number; page: number }>(token, "list", { segment, filter, search, page });
    setLoading(false);
    if (d.error) { setErr(d.error); return; }
    setItems(d.items || []);
    setTotal(Number(d.total) || 0);
  }, [token, segment, filter, search, page]);

  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => { setSelected(new Set()); }, [segment, filter, search, page]);

  const pages = Math.max(1, Math.ceil(total / 50));
  const allChecked = items.length > 0 && items.every(i => selected.has(i.id));

  function toggle(id: number) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(items.map(i => i.id)));
  }
  function patch(id: number, p: Partial<Advertiser>) {
    setItems(list => list.map(i => i.id === id ? { ...i, ...p } : i));
  }
  async function setStatus(id: number, status: string) {
    patch(id, { status });
    const d = await advPost<{ ok: boolean }>(token, "update", { id, status });
    if (d.error) setErr(d.error);
  }
  async function sendSelected() {
    await onSendIds([...selected]);
    setSelected(new Set());
  }

  return (
    <div className="glass border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-white font-semibold flex items-center gap-2 mr-2"><Icon name="Table" size={15} />Компании</div>
        <select value={segment} onChange={e => { setSegment(e.target.value); setPage(1); }} className={sel}>
          <option value="">Все сегменты</option>
          {segments.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className={sel}>
          {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Название, ИНН, почта, регион" className={`${inp} pl-9`} />
        </div>
        <button onClick={sendSelected} disabled={selected.size === 0 || !!busy} className={btnPrimary}>
          <Icon name={busy === "send-ids" ? "Loader2" : "Send"} size={14} className={busy === "send-ids" ? "animate-spin" : ""} />
          Отправить выбранным{selected.size ? ` (${selected.size})` : ""}
        </button>
      </div>

      <div className="text-xs text-white/40 flex items-center gap-2">
        Найдено: {total}
        {loading && <Icon name="Loader2" size={12} className="animate-spin" />}
        {err && <span className="text-red-300">{err}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/40 border-b border-white/10">
              <th className="py-2 pr-2 w-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-violet-500" /></th>
              <th className="py-2 pr-3">Компания</th>
              <th className="py-2 pr-3">Руководитель</th>
              <th className="py-2 pr-3">Контакты</th>
              <th className="py-2 pr-3">Поиск</th>
              <th className="py-2 pr-3">Рассылка</th>
              <th className="py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => {
              const [enrLabel, enrCls] = ENRICH[i.enrich_status || ""] || [i.enrich_status, "bg-white/10 text-white/60"];
              const meta = [i.region, fmtRevenue(i.revenue), segNames[i.subsegment] || i.subsegment].filter(Boolean).join(" · ");
              return (
                <tr key={i.id} className="border-b border-white/5 align-top hover:bg-white/[0.03]">
                  <td className="py-2.5 pr-2"><input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="accent-violet-500" /></td>
                  <td className="py-2.5 pr-3 min-w-56">
                    <div className="text-white font-medium leading-snug">{i.company_name}</div>
                    <div className="text-xs text-white/40 mt-0.5">{meta}</div>
                    {i.inn && <div className="text-[11px] text-white/30">ИНН {i.inn}</div>}
                  </td>
                  <td className="py-2.5 pr-3 min-w-40">
                    <div className="text-white/80">{i.contact_name || <span className="text-white/30">—</span>}</div>
                    {i.contact_post && <div className="text-xs text-white/40">{i.contact_post}</div>}
                  </td>
                  <td className="py-2.5 pr-3 min-w-52 text-xs space-y-0.5">
                    <EmailCell token={token} item={i} onSaved={email => patch(i.id, { email })} />
                    {i.phone && <div className="text-white/70">{i.phone}</div>}
                    {i.website && (
                      <a href={siteHref(i.website)} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white flex items-center gap-1 break-all">
                        <Icon name="Globe" size={11} />{i.website.replace(/^https?:\/\//i, "")}
                      </a>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span title={i.enrich_note || ""} className={`inline-block text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${enrCls}`}>{enrLabel}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs whitespace-nowrap">
                    {Number(i.campaign_step) === 0 || !i.campaign_step ? <span className="text-white/30">—</span>
                      : Number(i.campaign_step) === 1 ? <span className="text-cyan-300">письмо {fmtDate(i.campaign_sent_at)}</span>
                        : <span className="text-violet-300">напоминание</span>}
                  </td>
                  <td className="py-2.5">
                    <select value={i.status || "new"} onChange={e => setStatus(i.id, e.target.value)} className={`${sel} py-1 text-xs`}>
                      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-white/40 text-sm">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-white/5 text-white/70 disabled:opacity-30"><Icon name="ChevronLeft" size={14} /></button>
          <span className="text-white/60">Страница {page} из {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="p-2 rounded-lg bg-white/5 text-white/70 disabled:opacity-30"><Icon name="ChevronRight" size={14} /></button>
        </div>
      )}
    </div>
  );
}
