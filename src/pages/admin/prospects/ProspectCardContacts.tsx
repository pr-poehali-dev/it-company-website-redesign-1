import Icon from "@/components/ui/icon";
import { Prospect, PROSPECTS_URL } from "./types";
import { useState } from "react";

interface EmailResult {
  emails: string[];
  primary: string;
  confidence: string;
  note: string;
}

interface Props {
  prospect: Prospect;
  token: string;
  onEmailFound?: (email: string) => void;
  onKpRecipientChange: (email: string) => void;
}

export default function ProspectCardContacts({ prospect, token, onEmailFound, onKpRecipientChange }: Props) {
  const [findingEmail, setFindingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleFindEmail() {
    setFindingEmail(true);
    setEmailResult(null);
    setSaved(false);
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
        onKpRecipientChange(data.primary);
        // Автоматически сохраняем найденный email
        await handleSaveEmail(data.primary);
      }
    } finally {
      setFindingEmail(false);
    }
  }

  async function handleSaveEmail(email: string) {
    setSaving(true);
    try {
      if (onEmailFound) onEmailFound(email);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
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
            <a
              href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
              target="_blank" rel="noreferrer"
              className="text-violet-600 hover:underline truncate font-medium"
            >
              {prospect.website}
            </a>
          </div>
        )}
      </div>

      {!prospect.email && (
        <div className="mt-3 space-y-2">
          <button
            onClick={handleFindEmail}
            disabled={findingEmail || saving}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50 font-medium"
          >
            {findingEmail
              ? <><Icon name="Loader2" size={14} className="animate-spin" />Ищу email в Яндексе...</>
              : saving
                ? <><Icon name="Loader2" size={14} className="animate-spin" />Сохраняю...</>
                : <><Icon name="SearchCheck" size={14} />Найти email автоматически</>}
          </button>

          {emailResult && (
            <div className={`rounded-xl p-3 text-sm border ${emailResult.primary ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
              {emailResult.primary ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="Mail" size={14} className="text-emerald-600" />
                    <span className="font-semibold text-emerald-700">{emailResult.primary}</span>
                    {emailResult.emails.length > 1 && (
                      <span className="text-gray-400 text-xs">+ ещё {emailResult.emails.length - 1}</span>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(emailResult.primary)}
                      className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                      <Icon name="Copy" size={13} />
                    </button>
                  </div>
                  {saved ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <Icon name="CheckCircle" size={13} />
                      Сохранён в карточку — больше не нужно искать
                    </div>
                  ) : null}
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
  );
}
