import { useState } from "react";
import Icon from "@/components/ui/icon";
import { EmailTemplate, PLACEHOLDERS, campaignsApi } from "./campaignTypes";

interface Props {
  token: string;
  template: EmailTemplate;
  onSaved: () => void;
  onClose: () => void;
}

const field = "w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 bg-transparent focus:outline-none focus:border-violet-500/50";

export default function CampaignTemplateEditor({ token, template, onSaved, onClose }: Props) {
  const [form, setForm] = useState({
    subject: template.subject,
    body: template.body,
    followup_subject: template.followup_subject,
    followup_body: template.followup_body,
    article_url: template.article_url,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const data = await campaignsApi(token, "save_template", { code: template.code, ...form });
    setSaving(false);
    if (data.error) { setError(data.error); return; }
    onSaved();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass neon-border rounded-2xl p-6 space-y-4 bg-[#0b0b16]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Шаблон: {template.title}</h3>
            <p className="text-xs text-white/40 mt-0.5">{template.audience}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Ссылка на статью на учисьпро.рф (обязательно)</label>
          <input value={form.article_url} onChange={set("article_url")} placeholder="https://учисьпро.рф/feed/..." className={field} />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Тема письма</label>
          <input value={form.subject} onChange={set("subject")} className={field} />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Текст письма</label>
          <textarea value={form.body} onChange={set("body")} rows={12} className={`${field} font-mono text-xs leading-relaxed`} />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Тема напоминания</label>
          <input value={form.followup_subject} onChange={set("followup_subject")} className={field} />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Текст напоминания (через 5 дней, если нет ответа)</label>
          <textarea value={form.followup_body} onChange={set("followup_body")} rows={7} className={`${field} font-mono text-xs leading-relaxed`} />
        </div>

        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-xs text-white/50 mb-2">Поля для автоподстановки</div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {PLACEHOLDERS.map(p => (
              <div key={p.key} className="text-xs text-white/60">
                <code className="text-violet-300">{p.key}</code> — {p.label}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-2">Подпись с вашим именем и телефоном и строка «ответьте „нет“» добавляются автоматически.</p>
        </div>

        {error && <div className="text-sm text-red-300">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white">Отмена</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold">
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
