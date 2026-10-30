import { useState } from "react";
import Icon from "@/components/ui/icon";
import { inp, lbl } from "../upload";
import { AdvSettings, advPost, btnGhost, btnPrimary } from "./api";

interface Props {
  token: string;
  settings: AdvSettings;
  dailyLimit: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsPanel({ token, settings, dailyLimit, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    sender_name: settings.sender_name || "",
    sender_phone: settings.sender_phone || "",
    reply_to: settings.reply_to || "",
    ads_daily_limit: String(settings.ads_daily_limit ?? dailyLimit ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true); setErr("");
    const d = await advPost<{ ok: boolean }>(token, "save_settings", form);
    setSaving(false);
    if (d.error) { setErr(d.error); return; }
    onSaved();
    onClose();
  }

  const fields: [keyof typeof form, string, string][] = [
    ["sender_name", "Имя в подписи", "Иван Петров, отдел рекламы"],
    ["sender_phone", "Телефон в подписи", "+7 900 000-00-00"],
    ["reply_to", "Ответы на адрес", "manager@example.ru"],
    ["ads_daily_limit", "Писем в день", "50"],
  ];

  return (
    <div className="glass border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-white font-semibold flex items-center gap-2"><Icon name="Settings" size={15} />Настройки рассылки</div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"><Icon name="X" size={15} /></button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {fields.map(([k, label, ph]) => (
          <div key={k}>
            <label className={lbl}>{label}</label>
            <input value={form[k]} placeholder={ph} type={k === "ads_daily_limit" ? "number" : "text"}
              onChange={e => setForm({ ...form, [k]: e.target.value })} className={inp} />
          </div>
        ))}
      </div>
      {err && <div className="text-sm text-red-300">{err}</div>}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <span className="text-xs text-white/40">«Ответы на адрес» — почта менеджера, куда придут ответы рекламодателей.</span>
        <div className="flex gap-2">
          <button onClick={onClose} className={btnGhost}>Отмена</button>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            <Icon name={saving ? "Loader2" : "Save"} size={14} className={saving ? "animate-spin" : ""} />Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
