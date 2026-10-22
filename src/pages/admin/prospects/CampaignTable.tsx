import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { CampaignItem, campaignsApi } from "./campaignTypes";

interface Props {
  token: string;
  reloadKey: number;
  templateLabels: Record<string, string>;
  onPreview: (id: number) => void;
  onSend: (template: string, ids: number[]) => void;
  sending: boolean;
}

const sel = "glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-transparent focus:outline-none";

export default function CampaignTable({ token, reloadKey, templateLabels, onPreview, onSend, sending }: Props) {
  const [template, setTemplate] = useState("fsi");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editEmail, setEditEmail] = useState<{ id: number; value: string } | null>(null);
  const [emailErr, setEmailErr] = useState("");

  useEffect(() => { setPage(1); }, [template, filter, search]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const data = await campaignsApi(token, "list", undefined, { template, filter, search, page: String(page) });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [token, template, filter, search, page, reloadKey]);

  async function saveEmail() {
    if (!editEmail) return;
    const data = await campaignsApi(token, "set_email", { prospect_id: editEmail.id, email: editEmail.value });
    if (data.error) { setEmailErr(data.error); return; }
    setItems(items.map(i => i.id === editEmail.id ? { ...i, email: editEmail.value.trim().toLowerCase() } : i));
    setEditEmail(null);
    setEmailErr("");
  }

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="glass neon-border rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={template} onChange={e => setTemplate(e.target.value)} className={sel}>
          {Object.entries(templateLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="none">Без шаблона</option>
          <option value="">Все компании</option>
        </select>
        <select value={filter} onChange={e => setFilter(e.target.value)} className={sel}>
          <option value="all">Все</option>
          <option value="ready">Готовы к письму</option>
          <option value="no_email">Нужен email</option>
          <option value="sent">Письмо отправлено</option>
          <option value="followup_due">Пора напомнить</option>
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Компания, ИНН или регион"
          className={`${sel} flex-1 min-w-48 placeholder-white/30`} />
        <span className="text-xs text-white/40">{total} компаний</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/40 border-b border-white/10">
              <th className="py-2 pr-3">Компания</th>
              <th className="py-2 pr-3">Регион</th>
              <th className="py-2 pr-3">Грант</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Статус</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="py-6 text-center text-white/40"><Icon name="Loader2" size={16} className="animate-spin inline" /></td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-white/40">Нет компаний. Загрузите 1-ю волну кнопкой вверху.</td></tr>
            )}
            {!loading && items.map(i => (
              <tr key={i.id} className="border-b border-white/5 align-top">
                <td className="py-2 pr-3">
                  <div className="text-white">{i.company_name}</div>
                  <div className="text-[11px] text-white/40">ИНН {i.inn} · приоритет {i.campaign_priority ?? "—"}{i.rating_place ? ` · №${i.rating_place} в рейтинге` : ""}</div>
                </td>
                <td className="py-2 pr-3 text-white/70">{i.region || "—"}</td>
                <td className="py-2 pr-3 text-white/70">{i.grant_year || "—"}<div className="text-[11px] text-white/40">{i.grant_source}</div></td>
                <td className="py-2 pr-3">
                  {editEmail?.id === i.id ? (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <input autoFocus value={editEmail.value} onChange={e => setEditEmail({ id: i.id, value: e.target.value })}
                          onKeyDown={e => e.key === "Enter" && saveEmail()}
                          className="w-44 glass border border-white/10 rounded-lg px-2 py-1 text-xs text-white bg-transparent focus:outline-none" />
                        <button onClick={saveEmail} className="px-2 rounded-lg bg-violet-600 text-white text-xs">OK</button>
                      </div>
                      {emailErr && <div className="text-[11px] text-red-300">{emailErr}</div>}
                    </div>
                  ) : i.email ? (
                    <button onClick={() => setEditEmail({ id: i.id, value: i.email })} className="text-white/80 hover:text-white text-xs">{i.email}</button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setEditEmail({ id: i.id, value: "" })} className="text-xs text-violet-300 hover:underline">+ добавить</button>
                      {i.source_url && (
                        <a href={i.source_url} target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-white" title="Карточка с контактами">
                          <Icon name="ExternalLink" size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-3 text-xs">
                  {i.campaign_step >= 2 ? <span className="text-emerald-300">Напоминание отправлено</span>
                    : i.campaign_step === 1 ? <span className="text-blue-300">Письмо отправлено</span>
                    : <span className="text-white/40">Не писали</span>}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button onClick={() => onPreview(i.id)} disabled={!i.campaign_template}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30" title="Посмотреть письмо">
                    <Icon name="Eye" size={14} />
                  </button>
                  <button onClick={() => i.campaign_template && onSend(i.campaign_template, [i.id])}
                    disabled={sending || !i.email || !i.campaign_template || i.campaign_step > 0}
                    className="p-1.5 rounded-lg text-violet-300 hover:bg-violet-500/10 disabled:opacity-30" title="Отправить письмо">
                    <Icon name="Send" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-white/60">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-30"><Icon name="ChevronLeft" size={16} /></button>
          {page} / {pages}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="disabled:opacity-30"><Icon name="ChevronRight" size={16} /></button>
        </div>
      )}
    </div>
  );
}
