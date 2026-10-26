import { useState } from "react";
import Icon from "@/components/ui/icon";
import { ymLead } from "@/lib/ym";
import { Dashboard } from "./biEngine";
import { OwnedShare, forgetShare, publish, rememberShare, removeShare, shareLink, updateShare } from "./shareApi";

interface Props {
  dash: Dashboard;
  existing: OwnedShare | null;
  onClose: () => void;
  onChange: (s: OwnedShare | null) => void;
}

const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/35 focus:outline-none focus:border-violet-500/60";

export default function ShareDialog({ dash, existing, onClose, onChange }: Props) {
  const [f, setF] = useState({ name: "", email: "", phone: "", company: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [updated, setUpdated] = useState(false);
  const rows = dash.dataset.rows.length;
  const filteredHint = dash.filters.length > 0;

  async function doPublish() {
    if (!f.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setError("Укажите имя и рабочую почту");
    if (!agree) return setError("Подтвердите согласие на хранение данных");
    setBusy("pub"); setError("");
    const r = await publish(dash, f).catch(() => ({ error: "Нет связи" }) as { error: string; id: string; edit_key: string });
    setBusy("");
    if (r.error || !r.id) return setError(r.error || "Не удалось опубликовать");
    const s: OwnedShare = { id: r.id, key: r.edit_key, title: dash.dataset.name, at: new Date().toISOString() };
    rememberShare(s);
    onChange(s);
    ymLead("bi_share", { rows });
  }

  async function doUpdate() {
    if (!existing) return;
    setBusy("upd"); setError("");
    const r = await updateShare(existing.id, existing.key, dash).catch(() => ({ error: "Нет связи" }));
    setBusy("");
    if (r.error) return setError(r.error);
    setUpdated(true);
  }

  async function doRemove() {
    if (!existing || !confirm("Снять дашборд с публикации? Ссылка перестанет открываться.")) return;
    setBusy("del");
    const r = await removeShare(existing.id, existing.key).catch(() => ({ error: "Нет связи" }));
    setBusy("");
    if (r.error) return setError(r.error);
    forgetShare(existing.id);
    onChange(null);
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#10101c] border border-white/10 rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={18} /></button>
        <div className="flex items-center gap-2 mb-1"><Icon name="Share2" size={20} className="text-violet-300" /><h3 className="text-lg font-semibold text-white">Поделиться дашбордом</h3></div>

        {existing ? (
          <>
            <p className="text-sm text-white/55 mb-4">Ссылка работает 90 дней с последнего обновления. Коллеги видят графики и фильтры, но не могут ничего изменить.</p>
            <div className="flex gap-2 mb-3">
              <input readOnly value={shareLink(existing.id)} onFocus={e => e.target.select()} className={`${inp} font-mono text-xs`} />
              <button onClick={() => copy(shareLink(existing.id))} className="shrink-0 px-3 rounded-xl bg-violet-600 text-white flex items-center gap-1.5 text-sm">
                <Icon name={copied ? "Check" : "Copy"} size={15} />{copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareLink(existing.id))}&text=${encodeURIComponent(`Дашборд: ${dash.dataset.name}`)}`} target="_blank" rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 flex items-center gap-1.5"><Icon name="Send" size={14} />Telegram</a>
              <a href={`mailto:?subject=${encodeURIComponent(`Дашборд: ${dash.dataset.name}`)}&body=${encodeURIComponent(shareLink(existing.id))}`}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 flex items-center gap-1.5"><Icon name="Mail" size={14} />Почта</a>
              <a href={shareLink(existing.id)} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 flex items-center gap-1.5"><Icon name="ExternalLink" size={14} />Открыть</a>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-sm text-white/65 mb-4">
              Изменили графики или загрузили свежие данные? Обновите опубликованную версию — ссылка останется прежней.
            </div>
            <div className="flex gap-2">
              <button onClick={doUpdate} disabled={!!busy} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <Icon name={busy === "upd" ? "Loader2" : updated ? "Check" : "RefreshCw"} size={15} className={busy === "upd" ? "animate-spin" : ""} />{updated ? "Обновлено" : "Обновить по ссылке"}
              </button>
              <button onClick={doRemove} disabled={!!busy} className="px-3 py-2.5 rounded-xl border border-white/10 text-white/55 hover:text-rose-300 text-sm" title="Снять с публикации">
                <Icon name={busy === "del" ? "Loader2" : "Trash2"} size={15} className={busy === "del" ? "animate-spin" : ""} />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-white/55 mb-4">Получите ссылку, которую можно отправить руководителю или коллегам. Открывается в браузере, без регистрации.</p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-100/90 mb-4 flex gap-2">
              <Icon name="ShieldAlert" size={16} className="shrink-0 mt-0.5 text-amber-300" />
              <span>Для публикации данные дашборда ({rows.toLocaleString("ru-RU")} строк) будут сохранены на наших серверах в России и доступны всем, у кого есть ссылка.
                {filteredHint && " Публикуются все строки файла, а не только отфильтрованные."} Не публикуйте персональные данные клиентов.</span>
            </div>
            <div className="space-y-2.5">
              <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ваше имя *" className={inp} />
              <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Рабочая почта *" type="email" className={inp} />
              <div className="grid grid-cols-2 gap-2.5">
                <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="Телефон" className={inp} />
                <input value={f.company} onChange={e => setF({ ...f, company: e.target.value })} placeholder="Компания" className={inp} />
              </div>
              <input value={f.website} onChange={e => setF({ ...f, website: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
              <label className="flex gap-2 text-xs text-white/55 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="accent-violet-500 mt-0.5" />
                <span>Согласен на хранение данных дашборда на серверах МАТ-Лабс и на обработку моих контактов для связи по аналитике</span>
              </label>
            </div>
            {error && <p className="text-sm text-rose-300 mt-3">{error}</p>}
            <button onClick={doPublish} disabled={!!busy} className="w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              <Icon name={busy ? "Loader2" : "Link"} size={16} className={busy ? "animate-spin" : ""} />Получить ссылку
            </button>
          </>
        )}
        {existing && error && <p className="text-sm text-rose-300 mt-3">{error}</p>}
      </div>
    </div>
  );
}
