import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prospect, ACTIVITY_ICONS, statusInfo, priorityInfo, scoreColor, Activity, PROSPECTS_URL } from "./types";

const UNISENDER_URL = "https://functions.poehali.dev/ab7e3cca-4d86-41fc-80d4-255065a92d33";

interface Props {
  prospect: Prospect;
  activities: Activity[];
  token: string;
  onEdit: () => void;
  onClose: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  onMessage: (type: string) => void;
  generatingMsg: boolean;
  generatedMsg: string;
  onAddActivity: (type: string, content: string) => void;
  onEmailFound?: (email: string) => void;
}

export default function ProspectCard({
  prospect, activities, token, onEdit, onClose, onAnalyze, analyzing,
  onMessage, generatingMsg, generatedMsg, onAddActivity, onEmailFound,
}: Props) {
  const st = statusInfo(prospect.status);
  const pr = priorityInfo(prospect.priority);

  const [findingEmail, setFindingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ emails: string[]; primary: string; confidence: string; note: string } | null>(null);

  const [sendingKP, setSendingKP] = useState(false);
  const [kpSent, setKpSent] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showKPForm, setShowKPForm] = useState(false);
  const [kpSubject, setKpSubject] = useState(`Коммерческое предложение от МАТ-Лабс`);
  const [kpRecipient, setKpRecipient] = useState(prospect.email || "");

  async function handleFindEmail() {
    setFindingEmail(true);
    setEmailResult(null);
    try {
      const res = await fetch(PROSPECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "find_email",
          company_name: prospect.company_name,
          website: prospect.website || "",
        }),
      });
      const data = await res.json();
      setEmailResult(data);
      if (data.primary) {
        setKpRecipient(data.primary);
        if (onEmailFound) onEmailFound(data.primary);
      }
    } finally {
      setFindingEmail(false);
    }
  }

  async function handleSendKP() {
    const email = kpRecipient.trim();
    if (!email) return;
    setSendingKP(true);
    setKpSent(null);
    try {
      const kpHtml = buildKpHtml(prospect, generatedMsg);
      const res = await fetch(UNISENDER_URL + "/?action=send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: email,
          to_name: prospect.company_name,
          subject: kpSubject,
          body_html: kpHtml,
          tags: ["kp", "crm"],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKpSent({ ok: true, msg: `КП отправлено на ${email}` });
        onAddActivity("email", `Отправлено КП на ${email}: «${kpSubject}»`);
        setShowKPForm(false);
      } else {
        setKpSent({ ok: false, msg: data.error || "Ошибка отправки" });
      }
    } catch (e) {
      setKpSent({ ok: false, msg: "Ошибка соединения" });
    } finally {
      setSendingKP(false);
    }
  }

  const emailToUse = prospect.email || emailResult?.primary || kpRecipient;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{prospect.company_name}</h2>
              {prospect.ai_score !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                  prospect.ai_score >= 70 ? "bg-emerald-500" : prospect.ai_score >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}>
                  ИИ {prospect.ai_score}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg}`}>{st.label}</span>
              <span className={`text-xs font-medium ${pr.color}`}>{pr.label} приоритет</span>
              {prospect.project_name && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${prospect.project_color}22`, color: prospect.project_color || '#555' }}>
                  {prospect.project_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button onClick={onEdit}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-500">
              <Icon name="Edit" size={15} />
            </button>
            <button onClick={onClose}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-500">
              <Icon name="X" size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Контакты */}
          <div className="px-6 py-4 border-b border-gray-50">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { icon: "Building2", label: "ИНН", val: prospect.inn },
                { icon: "Hash", label: "ОГРН", val: prospect.ogrn },
                { icon: "Tag", label: "Отрасль", val: prospect.industry },
                { icon: "MapPin", label: "Регион", val: prospect.region },
                { icon: "Mail", label: "Email", val: prospect.email },
                { icon: "Phone", label: "Телефон", val: prospect.phone },
                { icon: "Users", label: "Сотрудников", val: prospect.employee_count },
                { icon: "TrendingUp", label: "Выручка", val: prospect.revenue_range },
              ].filter(f => f.val).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Icon name={f.icon as "Mail"} size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 flex-shrink-0">{f.label}:</span>
                  <span className="text-gray-800 truncate font-medium">{f.val}</span>
                </div>
              ))}
              {prospect.website && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <Icon name="Globe" size={13} className="text-gray-400" />
                  <a href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                    target="_blank" rel="noreferrer"
                    className="text-violet-600 hover:underline truncate font-medium">
                    {prospect.website}
                  </a>
                </div>
              )}
            </div>

            {/* Поиск email */}
            {!prospect.email && (
              <div className="mt-3 space-y-2">
                <button onClick={handleFindEmail} disabled={findingEmail}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50 font-medium">
                  {findingEmail
                    ? <><Icon name="Loader2" size={14} className="animate-spin" />Ищу email в Яндексе...</>
                    : <><Icon name="SearchCheck" size={14} />Найти email автоматически</>}
                </button>
                {emailResult && (
                  <div className={`rounded-xl p-3 text-sm border ${emailResult.primary ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                    {emailResult.primary ? (
                      <div className="flex items-center gap-2">
                        <Icon name="Mail" size={14} className="text-emerald-600" />
                        <span className="font-semibold text-emerald-700">{emailResult.primary}</span>
                        {emailResult.emails.length > 1 && (
                          <span className="text-gray-400 text-xs">+ ещё {emailResult.emails.length - 1}</span>
                        )}
                        <button onClick={() => navigator.clipboard.writeText(emailResult.primary)}
                          className="ml-auto text-gray-400 hover:text-gray-600">
                          <Icon name="Copy" size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Icon name="MailX" size={14} />Email не найден
                      </div>
                    )}
                    <div className="text-gray-400 text-xs mt-1">{emailResult.note}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Описание */}
          {prospect.description && (
            <div className="px-6 py-3 border-b border-gray-50">
              <p className="text-sm text-gray-600 leading-relaxed">{prospect.description}</p>
            </div>
          )}

          {/* ── Отправка КП ─────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Коммерческое предложение</span>
              {kpSent?.ok && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Icon name="CheckCircle" size={13} />{kpSent.msg}
                </span>
              )}
            </div>

            {!showKPForm ? (
              <button
                onClick={() => { setShowKPForm(true); setKpSent(null); }}
                disabled={!emailToUse}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="Send" size={15} />
                {emailToUse ? `Отправить КП на ${emailToUse}` : "Сначала найдите email"}
              </button>
            ) : (
              <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Email получателя</label>
                  <input
                    value={kpRecipient}
                    onChange={e => setKpRecipient(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white"
                    placeholder="email@company.ru"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Тема письма</label>
                  <input
                    value={kpSubject}
                    onChange={e => setKpSubject(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white"
                  />
                </div>
                {generatedMsg && (
                  <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg p-2">
                    <span className="font-medium text-gray-700">Текст из генератора:</span>
                    <p className="mt-1 line-clamp-3 text-gray-600">{generatedMsg.slice(0, 200)}...</p>
                  </div>
                )}
                {kpSent && !kpSent.ok && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                    <Icon name="AlertCircle" size={14} />{kpSent.msg}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSendKP} disabled={sendingKP || !kpRecipient.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40">
                    {sendingKP ? <><Icon name="Loader2" size={13} className="animate-spin" />Отправляю...</> : <><Icon name="Send" size={13} />Отправить</>}
                  </button>
                  <button onClick={() => setShowKPForm(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-all">
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── ИИ-анализ ───────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ИИ-анализ</span>
              <button onClick={onAnalyze} disabled={analyzing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-all disabled:opacity-40 font-medium">
                {analyzing ? <><Icon name="Loader2" size={12} className="animate-spin" />Анализирую...</> : <><Icon name="Sparkles" size={12} />Проанализировать</>}
              </button>
            </div>
            {prospect.ai_summary && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`text-xl font-bold ${scoreColor(prospect.ai_score)}`}>{prospect.ai_score}/100</div>
                  <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      (prospect.ai_score ?? 0) >= 70 ? "bg-emerald-500" : (prospect.ai_score ?? 0) >= 40 ? "bg-amber-500" : "bg-red-500"
                    }`} style={{ width: `${prospect.ai_score}%` }} />
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{prospect.ai_summary}</p>
                {prospect.ai_reasons?.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {prospect.ai_reasons.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                        <Icon name="ChevronRight" size={12} className="text-violet-500 flex-shrink-0 mt-0.5" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ── Генерация письма ────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-gray-50 space-y-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Генератор текста</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "email", label: "Письмо", icon: "Mail" },
                { key: "call", label: "Скрипт звонка", icon: "Phone" },
                { key: "linkedin", label: "LinkedIn", icon: "MessageCircle" },
              ].map(t => (
                <button key={t.key} onClick={() => onMessage(t.key)} disabled={generatingMsg}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-40">
                  <Icon name={t.icon as "Mail"} size={13} />
                  {t.label}
                </button>
              ))}
            </div>
            {generatingMsg && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Icon name="Loader2" size={13} className="animate-spin" />Генерирую...
              </div>
            )}
            {generatedMsg && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{generatedMsg}</pre>
                <div className="flex gap-3 mt-3">
                  <button onClick={() => navigator.clipboard.writeText(generatedMsg)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium">
                    <Icon name="Copy" size={12} />Копировать
                  </button>
                  <button onClick={() => { setShowKPForm(true); setKpSent(null); }}
                    className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium">
                    <Icon name="Send" size={12} />Отправить как КП
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Следующее действие */}
          {prospect.next_action && (
            <div className="px-6 py-3 border-b border-gray-50">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Icon name="Clock" size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-amber-700">Следующее действие</div>
                  <div className="text-sm text-gray-700 mt-0.5">{prospect.next_action}</div>
                  {prospect.next_action_date && (
                    <div className="text-xs text-gray-400 mt-0.5">{prospect.next_action_date}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {prospect.note && (
            <div className="px-6 py-3 border-b border-gray-50">
              <p className="text-sm text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-3">{prospect.note}</p>
            </div>
          )}

          {/* Добавить активность */}
          <div className="px-6 py-4 border-b border-gray-50">
            <QuickActivity onAdd={onAddActivity} />
          </div>

          {/* История */}
          {activities.length > 0 && (
            <div className="px-6 py-4 space-y-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">История</span>
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name={(ACTIVITY_ICONS[a.activity_type] || "FileText") as "Mail"} size={12} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-700 leading-relaxed">{a.content}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{new Date(a.created_at).toLocaleString('ru')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildKpHtml(prospect: Prospect, customText: string): string {
  const body = customText
    ? customText.replace(/\n/g, "<br>")
    : `
      <p>Добрый день!</p>
      <p>Меня зовут Александр Тюрин, я представляю IT-компанию <strong>МАТ-Лабс</strong>.</p>
      <p>Мы специализируемся на разработке цифровых продуктов: искусственный интеллект, автоматизация бизнес-процессов, CRM/ERP системы, облачные решения.</p>
      <p>Хотели бы предложить нашу экспертизу для <strong>${prospect.company_name}</strong>${prospect.industry ? ` в сфере ${prospect.industry}` : ''}.</p>
      <p>Готовы организовать короткую встречу (15-20 минут) для обсуждения возможностей сотрудничества.</p>
    `;

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;">
      <div style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">МАТ-Лабс</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">IT-компания полного цикла</div>
    </div>
    <div style="padding:32px 36px;color:#333;font-size:15px;line-height:1.7;">
      ${body}
    </div>
    <div style="padding:20px 36px 32px;border-top:1px solid #f0f0f0;">
      <div style="font-size:13px;color:#888;">
        С уважением,<br>
        <strong style="color:#555;">Команда МАТ-Лабс</strong><br>
        <a href="https://mat-labs.ru" style="color:#7c3aed;">mat-labs.ru</a> · info@mat-labs.ru
      </div>
    </div>
  </div>
</body>
</html>`;
}

function QuickActivity({ onAdd }: { onAdd: (type: string, content: string) => void }) {
  const [type, setType] = useState("note");
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    onAdd(type, text.trim());
    setText("");
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Добавить активность</span>
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "note", label: "Заметка", icon: "FileText" },
          { key: "call", label: "Звонок", icon: "Phone" },
          { key: "email", label: "Email", icon: "Mail" },
          { key: "meeting", label: "Встреча", icon: "Users" },
        ].map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all ${
              type === t.key
                ? "border-violet-300 bg-violet-50 text-violet-700 font-medium"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}>
            <Icon name={t.icon as "Mail"} size={11} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Комментарий..."
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white placeholder-gray-300"
        />
        <button onClick={submit} disabled={!text.trim()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-30">
          Добавить
        </button>
      </div>
    </div>
  );
}
