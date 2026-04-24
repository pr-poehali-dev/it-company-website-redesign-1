import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prospect, ACTIVITY_ICONS, statusInfo, priorityInfo, Activity } from "./types";
import ProspectCardContacts from "./ProspectCardContacts";
import ProspectCardKP, { QuickActivity } from "./ProspectCardKP";
import ProspectCardAI from "./ProspectCardAI";

interface AgentResult {
  summary?: string;
  next_action?: string;
  next_action_date?: string;
  message_draft?: string;
  urgency?: string;
  confidence?: string;
  applied_actions?: string[];
  actions?: { type: string; label: string; auto: boolean }[];
  recommended_status?: string;
  recommended_priority?: string;
  note?: string;
}

interface Props {
  prospect: Prospect;
  activities: Activity[];
  token: string;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onAgentAct: (mode?: string) => Promise<AgentResult>;
  onAnalyze: () => void;
  analyzing: boolean;
  onMessage: (type: string) => void;
  generatingMsg: boolean;
  generatedMsg: string;
  onAddActivity: (type: string, content: string) => void;
  onEmailFound?: (email: string) => void;
}

export default function ProspectCard({
  prospect, activities, token, onEdit, onClose, onDelete, onAgentAct, onAnalyze, analyzing,
  onMessage, generatingMsg, generatedMsg, onAddActivity, onEmailFound,
}: Props) {
  const st = statusInfo(prospect.status);
  const pr = priorityInfo(prospect.priority);

  const [kpRecipient, setKpRecipient] = useState(prospect.email || "");
  const [showKPForm, setShowKPForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const emailToUse = prospect.email || kpRecipient;

  async function runAgent() {
    setAgentRunning(true);
    setAgentResult(null);
    const result = await onAgentAct("auto");
    setAgentResult(result);
    setAgentRunning(false);
  }

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
            <button onClick={onEdit} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-500" title="Редактировать">
              <Icon name="Edit" size={15} />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 font-medium">Удалить?</span>
                <button onClick={onDelete} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-all">Да</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-all">Нет</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-xl border border-red-100 hover:bg-red-50 transition-all text-red-400 hover:text-red-600" title="Удалить карточку">
                <Icon name="Trash2" size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-500" title="Закрыть">
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

          {/* ── AI-агент ──────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Icon name="Bot" size={13} className="text-violet-500" />AI-агент
              </span>
              <button
                onClick={runAgent}
                disabled={agentRunning}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all disabled:opacity-40 font-medium"
              >
                {agentRunning
                  ? <><Icon name="Loader2" size={12} className="animate-spin" />Думаю...</>
                  : <><Icon name="Zap" size={12} />Запустить агента</>}
              </button>
            </div>
            {agentResult && (
              <div className="space-y-3">
                {/* Итог */}
                <div className={`rounded-xl p-3 border text-sm leading-relaxed ${
                  agentResult.urgency === 'high' ? 'bg-red-50 border-red-200 text-red-800' :
                  agentResult.urgency === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-violet-50 border-violet-200 text-violet-800'
                }`}>
                  {agentResult.summary}
                </div>

                {/* Следующее действие */}
                {agentResult.next_action && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1">
                      <Icon name="CheckCircle" size={12} />Следующий шаг
                      {agentResult.next_action_date && <span className="font-normal text-emerald-500 ml-auto">{agentResult.next_action_date}</span>}
                    </div>
                    <p className="text-sm text-emerald-800">{agentResult.next_action}</p>
                  </div>
                )}

                {/* Черновик сообщения */}
                {agentResult.message_draft && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <Icon name="Mail" size={12} />Черновик письма от агента
                    </div>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{agentResult.message_draft}</pre>
                  </div>
                )}

                {/* Выполненные / ожидающие действия */}
                {agentResult.applied_actions && agentResult.applied_actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {agentResult.applied_actions.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-lg font-medium flex items-center gap-1">
                        <Icon name="Check" size={11} />{a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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