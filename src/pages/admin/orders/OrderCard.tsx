import { useState } from "react";
import Icon from "@/components/ui/icon";
import { OrderStatus, ReportOrder, STATUS_META, STATUS_ORDER, TYPE_LABEL, fmtDT, isTest, ordersPost } from "./ordersApi";

interface Props {
  o: ReportOrder;
  selected: boolean;
  onSelect: (v: boolean) => void;
  onChange: (patch: Partial<ReportOrder>) => void;
  onDeleted: () => void;
}

export default function OrderCard({ o, selected, onSelect, onChange, onDeleted }: Props) {
  const [busy, setBusy] = useState<"" | "gen" | "send" | "del" | "status">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [email, setEmail] = useState(o.email);
  const [note, setNote] = useState(o.admin_note);
  const [open, setOpen] = useState(false);
  const canAuto = o.report_type !== "custom" && o.report_type !== "service";

  async function setStatus(s: OrderStatus) {
    setBusy("status");
    const r = await ordersPost({ action: "status", id: o.id, status: s });
    setBusy("");
    if (r.ok) onChange({ status: s });
  }

  async function generate() {
    setBusy("gen");
    setMsg(null);
    const r = await ordersPost<{ pdf_url: string; xlsx_url: string; pdf_kb: number; xlsx_kb: number }>({ action: "generate", id: o.id }).catch(() => ({ error: "Нет связи" }) as { error: string; pdf_url: string; xlsx_url: string; pdf_kb: number; xlsx_kb: number });
    setBusy("");
    if (r.error) return setMsg({ ok: false, text: r.error });
    onChange({ pdf_url: r.pdf_url, xlsx_url: r.xlsx_url, generated_at: new Date().toISOString() });
    setMsg({ ok: true, text: `Готово: PDF ${r.pdf_kb} КБ${r.xlsx_kb ? `, Excel ${r.xlsx_kb} КБ` : ""}` });
  }

  async function send() {
    if (!email.trim()) return setMsg({ ok: false, text: "Укажите email клиента" });
    if (o.status !== "paid" && !confirm("Заказ не отмечен как оплаченный. Всё равно отправить отчёт?")) return;
    setBusy("send");
    setMsg(null);
    const r = await ordersPost<{ sent_to: string }>({ action: "send", id: o.id, email: email.trim() }).catch(() => ({ error: "Нет связи" }) as { error: string; sent_to: string });
    setBusy("");
    if (r.error) return setMsg({ ok: false, text: r.error });
    onChange({ status: "sent", sent_at: new Date().toISOString(), email: email.trim() });
    setMsg({ ok: true, text: `Отправлено на ${r.sent_to}` });
  }

  async function del() {
    if (!confirm(`Удалить заказ №${o.id}?`)) return;
    setBusy("del");
    const r = await ordersPost({ action: "delete", id: o.id });
    setBusy("");
    if (r.ok) onDeleted();
  }

  async function saveNote() {
    await ordersPost({ action: "note", id: o.id, note });
    if (email !== o.email) await ordersPost({ action: "update", id: o.id, email });
    onChange({ admin_note: note, email });
    setMsg({ ok: true, text: "Сохранено" });
  }

  const st = STATUS_META[o.status] || STATUS_META.new;
  const stepIdx = STATUS_ORDER.indexOf(o.status);

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${selected ? "border-violet-500/60 bg-violet-500/5" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={e => onSelect(e.target.checked)} className="mt-1.5 accent-violet-500" aria-label="Выбрать" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/40 text-sm">№{o.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${st.cls}`}><Icon name={st.icon} size={11} />{st.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">{TYPE_LABEL[o.report_type] || o.report_type}</span>
            {isTest(o) && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">тест</span>}
            <span className="text-xs text-white/35 ml-auto">{fmtDT(o.created_at)}</span>
          </div>
          <div className="text-white font-medium mt-1.5">{o.report_title}</div>
          <div className="text-sm text-white/55 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            <span className="flex items-center gap-1"><Icon name="User" size={13} />{o.name}{o.company ? ` · ${o.company}` : ""}{o.inn ? ` · ИНН ${o.inn}` : ""}</span>
            {o.phone && <a href={`tel:${o.phone}`} className="flex items-center gap-1 hover:text-white"><Icon name="Phone" size={13} />{o.phone}</a>}
            {o.email && <a href={`mailto:${o.email}`} className="flex items-center gap-1 hover:text-white"><Icon name="Mail" size={13} />{o.email}</a>}
            {o.price > 0 && <span className="text-cyan-300">{o.price.toLocaleString("ru-RU")} ₽</span>}
          </div>
          {o.comment && <div className="text-xs text-white/50 mt-1.5 bg-white/[0.03] rounded-lg px-2.5 py-1.5">«{o.comment}»</div>}

          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {STATUS_ORDER.map((s, i) => (
              <button key={s} onClick={() => setStatus(s)} disabled={busy !== ""}
                className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                  s === o.status ? STATUS_META[s].cls : i < stepIdx ? "border-white/10 text-white/50 bg-white/[0.04]" : "border-white/10 text-white/40 hover:text-white hover:bg-white/5"}`}>
                {i < stepIdx && <Icon name="Check" size={11} />}{STATUS_META[s].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {canAuto ? (
              <button onClick={generate} disabled={busy !== ""}
                className="text-sm px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center gap-1.5 disabled:opacity-50">
                <Icon name={busy === "gen" ? "Loader2" : "FileCog"} size={15} className={busy === "gen" ? "animate-spin" : ""} />
                {o.pdf_url ? "Пересобрать отчёт" : "Сформировать PDF и Excel"}
              </button>
            ) : <span className="text-xs text-white/40">{o.report_type === "service" ? "Услуга под ключ — КП и договор вручную" : "Исследование готовится вручную"}</span>}
            {o.pdf_url && <a href={o.pdf_url} target="_blank" rel="noreferrer" className="text-sm px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 hover:bg-rose-500/20 flex items-center gap-1.5"><Icon name="FileText" size={14} />PDF</a>}
            {o.xlsx_url && <a href={o.xlsx_url} target="_blank" rel="noreferrer" className="text-sm px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 flex items-center gap-1.5"><Icon name="FileSpreadsheet" size={14} />Excel</a>}
            {o.pdf_url && (
              <button onClick={send} disabled={busy !== ""}
                className="text-sm px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white flex items-center gap-1.5 disabled:opacity-50">
                <Icon name={busy === "send" ? "Loader2" : "Send"} size={14} className={busy === "send" ? "animate-spin" : ""} />Отправить клиенту
              </button>
            )}
            <button onClick={() => setOpen(v => !v)} className="text-sm px-2.5 py-2 rounded-xl text-white/50 hover:text-white flex items-center gap-1">
              <Icon name="SlidersHorizontal" size={14} />Детали
            </button>
            <button onClick={del} disabled={busy !== ""} className="ml-auto text-sm px-2.5 py-2 rounded-xl text-white/40 hover:text-rose-300 flex items-center gap-1" title="Удалить заказ">
              <Icon name={busy === "del" ? "Loader2" : "Trash2"} size={14} className={busy === "del" ? "animate-spin" : ""} />
            </button>
          </div>
          {msg && <div className={`text-xs mt-2 ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</div>}

          {open && (
            <div className="mt-3 grid md:grid-cols-2 gap-3 border-t border-white/5 pt-3">
              <label className="text-xs text-white/50">Email для отправки
                <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </label>
              <label className="text-xs text-white/50">Заметка для себя (номер счёта, договорённости)
                <input value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </label>
              <div className="text-xs text-white/40 md:col-span-2 flex flex-wrap gap-x-4 gap-y-1">
                <span>Ключ отчёта: {o.report_key || "—"}</span>
                {o.invoiced_at && <span>Счёт: {fmtDT(o.invoiced_at)}</span>}
                {o.paid_at && <span>Оплата: {fmtDT(o.paid_at)}</span>}
                {o.generated_at && <span>Сформирован: {fmtDT(o.generated_at)}</span>}
                {o.sent_at && <span>Отправлен: {fmtDT(o.sent_at)}</span>}
                <button onClick={saveNote} className="ml-auto text-violet-300 hover:text-white">Сохранить</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
