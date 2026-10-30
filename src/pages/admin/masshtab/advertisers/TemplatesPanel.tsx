import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { inp, lbl } from "../upload";
import { AdvTemplate, Preview, advPost, btnGhost, btnPrimary } from "./api";

interface Props {
  token: string;
  templates: AdvTemplate[];
  defaultTo: string;
  onSaved: () => void;
  onMessage: (ok: boolean, text: string) => void;
}

const PLACEHOLDERS = ["{company}", "{pitch}", "{region}", "{mediakit_url}", "{site}", "{segment}"];

function Modal({ onClose, children, wide }: { onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? "max-w-3xl" : "max-w-2xl"} max-h-[90vh] overflow-y-auto bg-[#0f1220] border border-white/10 rounded-2xl p-6 space-y-4 text-white`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
          <Icon name="X" size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

function PreviewModal({ token, template, onClose }: { token: string; template: AdvTemplate; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState<(Partial<Preview> & { error?: string }) | null>(null);

  useEffect(() => {
    setData(null);
    advPost<Preview>(token, "preview", { template: template.code, step }).then(setData);
  }, [token, template.code, step]);

  return (
    <Modal onClose={onClose}>
      <div className="font-semibold pr-8">{template.title}</div>
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {([1, 2] as const).map(s => (
          <button key={s} onClick={() => setStep(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${step === s ? "bg-white text-black font-semibold" : "text-white/60 hover:text-white"}`}>
            {s === 1 ? "Письмо" : "Напоминание"}
          </button>
        ))}
      </div>
      {!data && <div className="text-sm text-white/50 flex items-center gap-2"><Icon name="Loader2" size={14} className="animate-spin" />Собираю письмо...</div>}
      {data?.error && <div className="text-sm text-red-300">{data.error}</div>}
      {data && !data.error && (
        <>
          <div className="text-xs text-white/50">
            Пример для: <span className="text-white/80">{data.company || "—"}</span>
            {" · "}{data.email || <span className="text-amber-300">почта не найдена</span>}
          </div>
          {data.problems && data.problems.length > 0 && (
            <div className="text-sm rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 p-3">
              Не заполнено: {data.problems.join(", ")}. Исправьте шаблон или настройки перед рассылкой.
            </div>
          )}
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 text-sm font-semibold">{data.subject}</div>
            <div className="px-4 py-3 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{data.text}</div>
          </div>
        </>
      )}
    </Modal>
  );
}

function EditorModal({ token, template, onClose, onSaved }: { token: string; template: AdvTemplate; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    subject: template.subject || "", body: template.body || "",
    followup_subject: template.followup_subject || "", followup_body: template.followup_body || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true); setErr("");
    const d = await advPost<{ ok: boolean }>(token, "save_template", { code: template.code, ...form });
    setSaving(false);
    if (d.error) { setErr(d.error); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="font-semibold pr-8">Шаблон: {template.title}</div>
      <div className="text-xs text-white/50 flex flex-wrap gap-1.5 items-center">
        Подстановки:
        {PLACEHOLDERS.map(p => <code key={p} className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">{p}</code>)}
      </div>
      <div>
        <label className={lbl}>Тема письма</label>
        <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className={inp} />
      </div>
      <div>
        <label className={lbl}>Текст письма</label>
        <textarea rows={10} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className={`${inp} font-mono leading-relaxed`} />
      </div>
      <div>
        <label className={lbl}>Тема напоминания</label>
        <input value={form.followup_subject} onChange={e => setForm({ ...form, followup_subject: e.target.value })} className={inp} />
      </div>
      <div>
        <label className={lbl}>Текст напоминания</label>
        <textarea rows={6} value={form.followup_body} onChange={e => setForm({ ...form, followup_body: e.target.value })} className={`${inp} font-mono leading-relaxed`} />
      </div>
      {err && <div className="text-sm text-red-300">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>Отмена</button>
        <button onClick={save} disabled={saving} className={btnPrimary}>
          <Icon name={saving ? "Loader2" : "Save"} size={14} className={saving ? "animate-spin" : ""} />Сохранить
        </button>
      </div>
    </Modal>
  );
}

export default function TemplatesPanel({ token, templates, defaultTo, onSaved, onMessage }: Props) {
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState("");
  const [preview, setPreview] = useState<AdvTemplate | null>(null);
  const [editing, setEditing] = useState<AdvTemplate | null>(null);

  async function sendTest(code: string) {
    const to = testTo || defaultTo;
    if (!to) { onMessage(false, "Укажите почту для теста или заполните «Ответы на адрес» в настройках."); return; }
    setTesting(code);
    const d = await advPost<{ ok: boolean; company: string }>(token, "test_send", { template: code, step: 1, to });
    setTesting("");
    if (d.error) onMessage(false, d.error);
    else onMessage(true, `Тестовое письмо отправлено на ${to} (пример — ${d.company || "компания"}). Проверьте «Входящие» и «Спам».`);
  }

  return (
    <div className="glass border border-white/10 rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Mail" size={16} className="text-violet-300" />
          <span className="text-white font-semibold">Шаблоны писем</span>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-64 max-w-md">
          <Icon name="FlaskConical" size={14} className="text-white/40" />
          <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder={defaultTo || "почта для теста"} className={inp} />
        </div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {templates.map(t => (
          <div key={t.code} className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2 flex flex-col">
            <div className="text-white font-medium">{t.title}</div>
            {t.audience && <div className="text-xs text-white/40 line-clamp-2">{t.audience}</div>}
            <div className="text-xs text-white/70 line-clamp-2"><span className="text-white/40">Тема: </span>{t.subject}</div>
            <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
              <button onClick={() => setPreview(t)} className={btnGhost}><Icon name="Eye" size={13} />Предпросмотр</button>
              <button onClick={() => setEditing(t)} className={btnGhost}><Icon name="Pencil" size={13} />Редактировать</button>
              <button onClick={() => sendTest(t.code)} disabled={!!testing} className={btnGhost}>
                <Icon name={testing === t.code ? "Loader2" : "FlaskConical"} size={13} className={testing === t.code ? "animate-spin" : ""} />Тест себе
              </button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <div className="text-sm text-white/40">Шаблонов пока нет.</div>}
      </div>
      {preview && <PreviewModal token={token} template={preview} onClose={() => setPreview(null)} />}
      {editing && <EditorModal token={token} template={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}
