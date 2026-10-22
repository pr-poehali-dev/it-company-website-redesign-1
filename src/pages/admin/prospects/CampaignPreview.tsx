import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { campaignsApi } from "./campaignTypes";

interface Props {
  token: string;
  prospectId?: number;
  template?: string;
  onClose: () => void;
}

interface PreviewData {
  prospect?: { company_name: string; region: string; email: string };
  subject?: string;
  text?: string;
  problems?: string[];
  error?: string;
}

export default function CampaignPreview({ token, prospectId, template, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PreviewData | null>(null);

  useEffect(() => {
    setData(null);
    campaignsApi(token, "preview", { prospect_id: prospectId, template, step }).then(setData);
  }, [token, prospectId, template, step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[1, 2].map(s => (
              <button key={s} onClick={() => setStep(s)}
                className={`px-3 py-1.5 rounded-lg text-sm ${step === s ? "bg-white shadow text-gray-900 font-medium" : "text-gray-500"}`}>
                {s === 1 ? "Письмо" : "Напоминание"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50">
            <Icon name="X" size={16} />
          </button>
        </div>

        {!data && <div className="text-sm text-gray-500 flex items-center gap-2"><Icon name="Loader2" size={14} className="animate-spin" />Собираю письмо...</div>}
        {data?.error && <div className="text-sm text-red-600">{data.error}</div>}
        {data?.subject && (
          <>
            <div className="text-xs text-gray-500">
              Кому: <span className="text-gray-800">{data.prospect?.company_name}</span>
              {data.prospect?.region ? `, ${data.prospect.region}` : ""}
              {" · "}{data.prospect?.email || <span className="text-amber-600">email не указан</span>}
            </div>
            {data.problems && data.problems.length > 0 && (
              <div className="text-sm rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-3">
                Не заполнено: {data.problems.map(p => p === "article_url" ? "ссылка на статью" : `{${p}}`).join(", ")}. Отправка заблокирована, пока не исправите шаблон.
              </div>
            )}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-900">{data.subject}</div>
              <div className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{data.text}</div>
              <div className="px-4 pb-3 text-xs text-gray-400">+ подпись и строка «если неактуально — ответьте „нет“»</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
