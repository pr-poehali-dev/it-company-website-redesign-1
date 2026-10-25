import { useEffect, useState, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import {
  EmailTemplate, TemplateStats, CampaignSettings, campaignsApi,
} from "./campaignTypes";
import CampaignTemplateEditor from "./CampaignTemplateEditor";
import CampaignPreview from "./CampaignPreview";
import CampaignTable from "./CampaignTable";

interface Props { token: string }

const TPL_LABEL: Record<string, string> = { fsi: "Гранты ФСИ", industry: "Производители", apk: "Хозяйства АПК" };

export default function CampaignsTab({ token }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<Record<string, TemplateStats>>({});
  const [total, setTotal] = useState(0);
  const [sentToday, setSentToday] = useState(0);
  const [settings, setSettings] = useState<CampaignSettings>({});
  const [loading, setLoading] = useState(true);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [preview, setPreview] = useState<{ id?: number; template?: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<CampaignSettings>({});

  const [sendCount, setSendCount] = useState<Record<string, number>>({ fsi: 10, industry: 10, apk: 10 });
  const [sending, setSending] = useState("");
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState("");
  const autoImported = useRef(false);

  const load = useCallback(async () => {
    const data = await campaignsApi(token, "overview");
    setTemplates(data.templates || []);
    setStats(data.stats || {});
    setTotal(data.total || 0);
    setSentToday(data.sent_today || 0);
    setSettings(data.settings || {});
    setLoading(false);
    return data.total || 0;
  }, [token]);

  useEffect(() => {
    load().then(t => {
      if (t === 0 && !autoImported.current) {
        autoImported.current = true;
        runImport();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function runImport() {
    setImporting(true);
    setImportMsg("");
    let offset = 0, inserted = 0, updated = 0;
    for (let i = 0; i < 40; i++) {
      const data = await campaignsApi(token, "import", { offset, limit: 300 });
      if (data.error) { setImportMsg(`Ошибка: ${data.error}`); setImporting(false); return; }
      inserted += data.inserted; updated += data.updated; offset = data.next_offset;
      setImportMsg(`Загружено ${offset} из ${data.total}...`);
      if (data.done) break;
    }
    setImportMsg(`Готово: добавлено ${inserted}, обновлено уже существующих ${updated}.`);
    setImporting(false);
    await load();
    setReloadKey(k => k + 1);
  }

  async function send(template: string, step: 1 | 2, ids?: number[]) {
    setSending(`${template}-${step}`);
    setSendMsg(null);
    let remaining = ids?.length ? ids.length : (sendCount[template] || 10);
    let sentTotal = 0, leftToday = 0;
    const errors: { company: string; error: string }[] = [];
    for (let i = 0; i < 40 && remaining > 0; i++) {
      const body = ids?.length ? { step, ids } : { step, template, count: remaining };
      const data = await campaignsApi(token, "send", body);
      if (data.error) {
        setSending("");
        setSendMsg({ ok: false, text: sentTotal ? `Отправлено: ${sentTotal}. Затем: ${data.error}` : data.error });
        await load(); setReloadKey(k => k + 1);
        return;
      }
      sentTotal += data.sent;
      leftToday = data.left_today;
      errors.push(...(data.errors || []));
      remaining -= data.sent + (data.errors || []).length;
      setSendMsg({ ok: true, text: `Отправляю... ${sentTotal}` });
      if (!data.skipped || leftToday === 0) break;
    }
    setSending("");
    setSendMsg({
      ok: errors.length === 0,
      text: `Отправлено: ${sentTotal}${errors.length ? `, ошибок: ${errors.length} (${errors[0].company}: ${errors[0].error})` : ""}. Осталось на сегодня: ${leftToday}.`,
    });
    await load();
    setReloadKey(k => k + 1);
  }

  async function sendTest(template: string) {
    setTesting(template);
    setSendMsg(null);
    const data = await campaignsApi(token, "test_send", { template, to: testTo || settings.reply_to || "" });
    setTesting("");
    setSendMsg(data.error
      ? { ok: false, text: data.error }
      : { ok: true, text: `Тестовое письмо отправлено (пример — ${data.company}). Проверьте папки «Входящие» и «Спам».` });
  }

  async function saveSettings() {
    await campaignsApi(token, "save_settings", settingsForm);
    setShowSettings(false);
    await load();
  }

  const limit = Number(settings.daily_limit || 50);
  const unassigned = stats[""]?.total || 0;

  if (loading) return <div className="text-white/40 text-sm flex items-center gap-2"><Icon name="Loader2" size={14} className="animate-spin" />Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="glass neon-border rounded-2xl p-4 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="text-white font-semibold">Кампания «1-я волна»: получатели грантов и субсидий</div>
          <div className="text-xs text-white/40 mt-0.5">
            В CRM: {total} компаний · отправлено сегодня {sentToday} из {limit}
            {unassigned > 0 && ` · без шаблона: ${unassigned} (фермеры, услуги и др.)`}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setSettingsForm(settings); setShowSettings(v => !v); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-sm text-white/70 hover:text-white">
            <Icon name="Settings" size={14} />Настройки
          </button>
          <button onClick={runImport} disabled={importing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold">
            <Icon name={importing ? "Loader2" : "Upload"} size={14} className={importing ? "animate-spin" : ""} />
            {total ? "Обновить из файла" : "Загрузить 4 237 компаний"}
          </button>
        </div>
      </div>
      {importMsg && <div className="text-sm text-white/70">{importMsg}</div>}

      {showSettings && (
        <div className="glass border border-white/10 rounded-2xl p-4 grid sm:grid-cols-4 gap-3">
          {([
            ["sender_name", "Имя в подписи"],
            ["sender_phone", "Телефон в подписи"],
            ["reply_to", "Ответы на адрес"],
            ["daily_limit", "Писем в день"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-white/50 mb-1 block">{label}</label>
              <input value={settingsForm[k] || ""} onChange={e => setSettingsForm({ ...settingsForm, [k]: e.target.value })}
                className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-transparent focus:outline-none" />
            </div>
          ))}
          <div className="sm:col-span-4 flex justify-between items-center">
            <span className="text-xs text-white/40">«Ответы на адрес» — личный ящик менеджера, куда придут ответы клиентов.</span>
            <button onClick={saveSettings} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm">Сохранить</button>
          </div>
        </div>
      )}

      <div className="glass border border-white/10 rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <Icon name="FlaskConical" size={14} className="text-violet-300" />
        <span className="text-sm text-white/70">Перед рассылкой отправьте тест себе:</span>
        <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder={settings.reply_to || "ваш@email.ru"}
          className="flex-1 min-w-48 glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 bg-transparent focus:outline-none" />
        <span className="text-xs text-white/40">Кнопка «Тест» — в карточке шаблона</span>
      </div>

      {sendMsg && (
        <div className={`text-sm rounded-xl p-3 border ${sendMsg.ok ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-amber-500/30 text-amber-200 bg-amber-500/10"}`}>
          {sendMsg.text}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {templates.map(t => {
          const st = stats[t.code] || { total: 0, with_email: 0, sent: 0, followups: 0, followup_due: 0, replied: 0 };
          const ready = st.with_email - st.sent;
          const noLink = !t.article_url;
          return (
            <div key={t.code} className="glass neon-border rounded-2xl p-4 space-y-3">
              <div>
                <div className="text-white font-semibold">{t.title}</div>
                <div className="text-xs text-white/40 mt-0.5 line-clamp-2">{t.audience}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Компаний", st.total], ["С email", st.with_email], ["Отправлено", st.sent]].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-white/5 py-2">
                    <div className="text-lg font-bold text-white">{v}</div>
                    <div className="text-[11px] text-white/40">{l}</div>
                  </div>
                ))}
              </div>
              {noLink && (
                <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2">
                  Укажите ссылку на статью — без неё отправка заблокирована.
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setEditing(t)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs text-white/70 hover:text-white">
                  <Icon name="Pencil" size={13} />Шаблон
                </button>
                <button onClick={() => setPreview({ template: t.code })} disabled={!st.total}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs text-white/70 hover:text-white disabled:opacity-40">
                  <Icon name="Eye" size={13} />Пример
                </button>
                <button onClick={() => sendTest(t.code)} disabled={!!testing || noLink || !(testTo || settings.reply_to)}
                  title={!(testTo || settings.reply_to) ? "Укажите свой email выше" : "Отправить тест себе"}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs text-white/70 hover:text-white disabled:opacity-40">
                  <Icon name={testing === t.code ? "Loader2" : "FlaskConical"} size={13} className={testing === t.code ? "animate-spin" : ""} />Тест
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" min={1} max={30} value={sendCount[t.code] || 10}
                  onChange={e => setSendCount({ ...sendCount, [t.code]: Math.max(1, Math.min(30, Number(e.target.value))) })}
                  className="w-16 glass border border-white/10 rounded-xl px-2 py-2 text-sm text-white bg-transparent focus:outline-none" />
                <button onClick={() => send(t.code, 1)} disabled={!!sending || noLink || ready <= 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold">
                  <Icon name={sending === `${t.code}-1` ? "Loader2" : "Send"} size={13} className={sending === `${t.code}-1` ? "animate-spin" : ""} />
                  Отправить лучшим
                </button>
              </div>
              <button onClick={() => send(t.code, 2)} disabled={!!sending || st.followup_due <= 0}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-violet-500/40 text-xs text-violet-200 hover:bg-violet-500/10 disabled:opacity-40">
                <Icon name="Repeat" size={13} />Напоминания: {st.followup_due} готово
              </button>
              <div className="text-[11px] text-white/40">Готово к письму: {Math.max(ready, 0)} · ответили: {st.replied}</div>
            </div>
          );
        })}
      </div>

      <CampaignTable
        token={token}
        reloadKey={reloadKey}
        templateLabels={TPL_LABEL}
        onPreview={id => setPreview({ id })}
        onSend={(tpl, ids) => send(tpl, 1, ids)}
        sending={!!sending}
      />

      {editing && (
        <CampaignTemplateEditor token={token} template={editing}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {preview && (
        <CampaignPreview token={token} prospectId={preview.id} template={preview.template} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
