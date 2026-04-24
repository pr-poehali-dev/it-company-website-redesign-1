import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Prospect, PROSPECTS_URL } from "./types";

const CRM_MAILER_URL = "https://functions.poehali.dev/0f73653d-eb69-4fc3-9e28-4819734962ef";
const KP_TEMPLATE_KEY = "kp_template_pdf"; // localStorage key

interface Props {
  prospect: Prospect;
  token: string;
  generatedMsg: string;
  emailToUse: string;
  kpRecipient: string;
  onKpRecipientChange: (email: string) => void;
  onAddActivity: (type: string, content: string) => void;
  onOpenKPForm: () => void;
  showKPForm: boolean;
  onCloseKPForm: () => void;
}

export function buildKpHtml(prospect: Prospect, customText: string, pdfUrl?: string, pdfName?: string): string {
  const body = customText
    ? customText.replace(/\n/g, "<br>")
    : `
      <p>Добрый день!</p>
      <p>Меня зовут Александр, я представляю IT-компанию <strong>МАТ-Лабс</strong>.</p>
      <p>Мы специализируемся на разработке цифровых продуктов: искусственный интеллект, автоматизация бизнес-процессов, CRM/ERP системы, облачные решения.</p>
      <p>Хотели бы предложить нашу экспертизу для <strong>${prospect.company_name}</strong>${prospect.industry ? ` в сфере ${prospect.industry}` : ''}.</p>
      <p>Готовы организовать короткую встречу (15–20 минут) для обсуждения возможностей сотрудничества.</p>
    `;

  const pdfBlock = pdfUrl ? `
    <div style="margin:24px 0;text-align:center;">
      <a href="${pdfUrl}" target="_blank"
        style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
        📄 Скачать коммерческое предложение
      </a>
      ${pdfName ? `<div style="margin-top:8px;font-size:12px;color:#aaa;">${pdfName}</div>` : ''}
    </div>
  ` : '';

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
      ${pdfBlock}
    </div>
    <div style="padding:20px 36px 32px;border-top:1px solid #f0f0f0;">
      <div style="font-size:13px;color:#555;line-height:1.8;">
        С уважением,<br>
        <strong style="color:#222;font-size:14px;">Александр</strong><br>
        <span style="color:#888;">Руководитель проекта · МАТ-Лабс</span><br>
        <a href="tel:+79277486868" style="color:#7c3aed;text-decoration:none;">+7 927 748 68 68</a><br>
        <a href="mailto:maksT77@yandex.ru" style="color:#7c3aed;text-decoration:none;">maksT77@yandex.ru</a>
        &nbsp;·&nbsp;
        <a href="https://mat-labs.ru" style="color:#7c3aed;text-decoration:none;">mat-labs.ru</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadTemplate(): { url: string; name: string } | null {
  try {
    const raw = localStorage.getItem(KP_TEMPLATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTemplate(url: string, name: string) {
  localStorage.setItem(KP_TEMPLATE_KEY, JSON.stringify({ url, name }));
}

function clearTemplate() {
  localStorage.removeItem(KP_TEMPLATE_KEY);
}

export default function ProspectCardKP({
  prospect, token, generatedMsg, emailToUse,
  kpRecipient, onKpRecipientChange, onAddActivity,
  onOpenKPForm, showKPForm, onCloseKPForm,
}: Props) {
  const [sendingKP, setSendingKP] = useState(false);
  const [kpSent, setKpSent] = useState<{ ok: boolean; msg: string } | null>(null);
  const [kpSubject, setKpSubject] = useState(`Коммерческое предложение от МАТ-Лабс`);

  const [kpFile, setKpFile] = useState<File | null>(null);
  const [kpFileUrl, setKpFileUrl] = useState<string>("");
  const [kpFileName, setKpFileName] = useState<string>("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [hasTemplate, setHasTemplate] = useState(false);

  // При открытии формы — подгружаем сохранённый шаблон из localStorage
  useEffect(() => {
    if (showKPForm && !kpFileUrl) {
      const tpl = loadTemplate();
      if (tpl) {
        setKpFileUrl(tpl.url);
        setKpFileName(tpl.name);
        setHasTemplate(true);
      }
    }
  }, [showKPForm]);

  async function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { alert("Только PDF файлы"); return; }
    if (file.size > 10 * 1024 * 1024) { alert("Файл слишком большой (макс 10 МБ)"); return; }
    setKpFile(file);
    setKpFileName(file.name);
    setKpFileUrl("");
    setHasTemplate(false);
    setUploadingPdf(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await fetch(PROSPECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "upload_kp", file: b64, filename: file.name }),
      });
      const data = await res.json();
      if (data.ok) {
        setKpFileUrl(data.url);
      } else {
        alert("Ошибка загрузки: " + data.error);
      }
    } finally {
      setUploadingPdf(false);
    }
  }

  function handleSaveAsTemplate() {
    if (!kpFileUrl || !kpFileName) return;
    saveTemplate(kpFileUrl, kpFileName);
    setHasTemplate(true);
  }

  function handleClearTemplate() {
    clearTemplate();
    setKpFileUrl("");
    setKpFileName("");
    setKpFile(null);
    setHasTemplate(false);
  }

  async function handleSendKP() {
    const email = kpRecipient.trim();
    if (!email) return;
    setSendingKP(true);
    setKpSent(null);
    try {
      const kpHtml = buildKpHtml(prospect, generatedMsg, kpFileUrl, kpFileName);
      const res = await fetch(CRM_MAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: email,
          to_name: prospect.company_name,
          subject: kpSubject,
          body_html: kpHtml,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKpSent({ ok: true, msg: `КП отправлено на ${email}` });
        onAddActivity("email", `Отправлено КП на ${email}: «${kpSubject}»`);
        onCloseKPForm();
      } else {
        setKpSent({ ok: false, msg: data.error || "Ошибка отправки" });
      }
    } catch {
      setKpSent({ ok: false, msg: "Ошибка соединения" });
    } finally {
      setSendingKP(false);
    }
  }

  return (
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
          onClick={() => { onOpenKPForm(); setKpSent(null); }}
          disabled={!emailToUse}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="Send" size={15} />
          {emailToUse ? `Отправить КП на ${emailToUse}` : "Сначала найдите email"}
        </button>
      ) : (
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">

          {/* Email получателя */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Email получателя</label>
            <input
              value={kpRecipient}
              onChange={e => onKpRecipientChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white"
              placeholder="email@company.ru"
            />
          </div>

          {/* Тема */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Тема письма</label>
            <input
              value={kpSubject}
              onChange={e => setKpSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white"
            />
          </div>

          {/* PDF */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">PDF с коммерческим предложением</label>

            {/* Загруженный / шаблон */}
            {kpFileUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm">
                  <Icon name="FileCheck" size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-medium truncate flex-1">{kpFileName}</span>
                  <a href={kpFileUrl} target="_blank" rel="noreferrer"
                    className="text-xs text-violet-600 hover:underline shrink-0">Открыть</a>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Сохранить как шаблон */}
                  {!hasTemplate ? (
                    <button onClick={handleSaveAsTemplate}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all font-medium">
                      <Icon name="Bookmark" size={12} />
                      Сохранить как шаблон
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
                      <Icon name="BookmarkCheck" size={12} />
                      Шаблон сохранён
                    </span>
                  )}
                  {/* Заменить файл */}
                  <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all cursor-pointer font-medium">
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfSelect} disabled={uploadingPdf} />
                    <Icon name="RefreshCw" size={12} />
                    Заменить файл
                  </label>
                  {/* Удалить шаблон */}
                  <button onClick={handleClearTemplate}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-all">
                    <Icon name="Trash2" size={12} />
                    Убрать
                  </button>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Icon name="Info" size={11} />
                  Кнопка «Скачать КП» появится в письме
                </p>
              </div>
            ) : (
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border-2 border-dashed transition-all text-sm border-gray-200 hover:border-violet-300 bg-white`}>
                <input type="file" accept=".pdf" className="hidden" onChange={handlePdfSelect} disabled={uploadingPdf} />
                {uploadingPdf ? (
                  <><Icon name="Loader2" size={14} className="animate-spin text-violet-500" /><span className="text-gray-500">Загружаю файл...</span></>
                ) : (
                  <><Icon name="Upload" size={14} className="text-gray-400" /><span className="text-gray-400">Выбрать PDF (макс. 10 МБ)</span></>
                )}
              </label>
            )}
          </div>

          {/* Превью текста из генератора */}
          {generatedMsg && (
            <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg p-2">
              <span className="font-medium text-gray-700">Текст из генератора:</span>
              <p className="mt-1 line-clamp-3 text-gray-600">{generatedMsg.slice(0, 200)}...</p>
            </div>
          )}

          {/* Ошибка */}
          {kpSent && !kpSent.ok && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
              <Icon name="AlertCircle" size={14} />{kpSent.msg}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSendKP}
              disabled={sendingKP || !kpRecipient.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            >
              {sendingKP
                ? <><Icon name="Loader2" size={13} className="animate-spin" />Отправляю...</>
                : <><Icon name="Send" size={13} />Отправить</>}
            </button>
            <button
              onClick={onCloseKPForm}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-all"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function QuickActivity({ onAdd }: { onAdd: (type: string, content: string) => void }) {
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
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-30"
        >
          Добавить
        </button>
      </div>
    </div>
  );
}