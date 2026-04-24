import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prospect, ACTIVITY_ICONS, statusInfo, priorityInfo, Activity } from "./types";
import ProspectCardContacts from "./ProspectCardContacts";
import ProspectCardKP, { QuickActivity } from "./ProspectCardKP";
import ProspectCardAI from "./ProspectCardAI";

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

  const [kpRecipient, setKpRecipient] = useState(prospect.email || "");
  const [showKPForm, setShowKPForm] = useState(false);
  const emailToUse = prospect.email || kpRecipient;

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
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${prospect.project_color}22`, color: prospect.project_color || '#555' }}
                >
                  {prospect.project_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button onClick={onEdit} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-500">
              <Icon name="Edit" size={15} />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-500">
              <Icon name="X" size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Контакты + поиск email */}
          <ProspectCardContacts
            prospect={prospect}
            token={token}
            onEmailFound={onEmailFound}
            onKpRecipientChange={setKpRecipient}
          />

          {/* Описание */}
          {prospect.description && (
            <div className="px-6 py-3 border-b border-gray-50">
              <p className="text-sm text-gray-600 leading-relaxed">{prospect.description}</p>
            </div>
          )}

          {/* Отправка КП */}
          <ProspectCardKP
            prospect={prospect}
            token={token}
            generatedMsg={generatedMsg}
            emailToUse={emailToUse}
            kpRecipient={kpRecipient}
            onKpRecipientChange={setKpRecipient}
            onAddActivity={onAddActivity}
            onOpenKPForm={() => setShowKPForm(true)}
            showKPForm={showKPForm}
            onCloseKPForm={() => setShowKPForm(false)}
          />

          {/* ИИ-анализ + генератор */}
          <ProspectCardAI
            prospect={prospect}
            token={token}
            analyzing={analyzing}
            onAnalyze={onAnalyze}
            generatingMsg={generatingMsg}
            generatedMsg={generatedMsg}
            onMessage={onMessage}
            onOpenKPForm={() => setShowKPForm(true)}
          />

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