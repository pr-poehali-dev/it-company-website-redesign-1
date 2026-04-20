import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prospect, ACTIVITY_ICONS, statusInfo, priorityInfo, scoreColor, scoreBg, Activity } from "./types";

interface Props {
  prospect: Prospect;
  activities: Activity[];
  onEdit: () => void;
  onClose: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  onMessage: (type: string) => void;
  generatingMsg: boolean;
  generatedMsg: string;
  onAddActivity: (type: string, content: string) => void;
}

export default function ProspectCard({
  prospect, activities, onEdit, onClose, onAnalyze, analyzing,
  onMessage, generatingMsg, generatedMsg, onAddActivity,
}: Props) {
  const st = statusInfo(prospect.status);
  const pr = priorityInfo(prospect.priority);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl h-[calc(100vh-2rem)] glass neon-border rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-oswald font-bold text-lg text-white leading-tight">{prospect.company_name}</h2>
              {prospect.ai_score !== null && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${scoreBg(prospect.ai_score)} text-white`}>
                  <Icon name="Star" size={10} /> {prospect.ai_score}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
              <span className={`text-xs ${pr.color}`}>{pr.label} приоритет</span>
              {prospect.project_name && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${prospect.project_color}22`, color: prospect.project_color || '#fff' }}>
                  {prospect.project_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button onClick={onEdit} className="glass border border-white/10 p-2 rounded-xl hover:border-violet-500/40 transition-all">
              <Icon name="Edit" size={14} className="text-white/60" />
            </button>
            <button onClick={onClose} className="glass border border-white/10 p-2 rounded-xl hover:border-white/30 transition-all">
              <Icon name="X" size={14} className="text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Контакты */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: "Building2", label: "ИНН", val: prospect.inn },
              { icon: "Hash", label: "ОГРН", val: prospect.ogrn },
              { icon: "Tag", label: "Отрасль", val: prospect.industry },
              { icon: "MapPin", label: "Регион", val: prospect.region },
              { icon: "Mail", label: "Email", val: prospect.email },
              { icon: "Phone", label: "Телефон", val: prospect.phone },
              { icon: "Users", label: "Сотрудники", val: prospect.employee_count },
              { icon: "TrendingUp", label: "Выручка", val: prospect.revenue_range },
            ].filter(f => f.val).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Icon name={f.icon as "Mail"} size={12} className="text-white/30 flex-shrink-0" />
                <span className="text-white/40 flex-shrink-0">{f.label}:</span>
                <span className="text-white/80 truncate">{f.val}</span>
              </div>
            ))}
            {prospect.website && (
              <div className="flex items-center gap-2 text-xs col-span-2">
                <Icon name="Globe" size={12} className="text-white/30" />
                <a href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                  target="_blank" rel="noreferrer" className="text-violet-400 hover:underline truncate">
                  {prospect.website}
                </a>
              </div>
            )}
          </div>

          {prospect.description && (
            <div className="text-xs text-white/50 leading-relaxed">{prospect.description}</div>
          )}

          {/* ИИ-анализ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 uppercase tracking-wider">ИИ-анализ</span>
              <button onClick={onAnalyze} disabled={analyzing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all disabled:opacity-40">
                {analyzing ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Sparkles" size={12} />}
                {analyzing ? "Анализирую..." : "Проанализировать"}
              </button>
            </div>

            {prospect.ai_summary && (
              <div className="glass border border-violet-500/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${scoreColor(prospect.ai_score)}`}>{prospect.ai_score}/100</div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBg(prospect.ai_score)}`} style={{ width: `${prospect.ai_score}%` }} />
                  </div>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{prospect.ai_summary}</p>
                {prospect.ai_reasons?.length > 0 && (
                  <ul className="space-y-1">
                    {prospect.ai_reasons.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/50">
                        <Icon name="ChevronRight" size={10} className="text-violet-400 flex-shrink-0 mt-0.5" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Генерация сообщений */}
          <div className="space-y-2">
            <span className="text-xs text-white/40 uppercase tracking-wider">Сообщение</span>
            <div className="flex gap-2">
              {["email", "call", "linkedin"].map(t => (
                <button key={t} onClick={() => onMessage(t)} disabled={generatingMsg}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl glass border border-white/10 text-white/60 hover:text-white hover:border-violet-500/40 transition-all disabled:opacity-40">
                  <Icon name={t === "email" ? "Mail" : t === "call" ? "Phone" : "MessageCircle"} size={11} />
                  {t === "email" ? "Письмо" : t === "call" ? "Скрипт звонка" : "LinkedIn"}
                </button>
              ))}
            </div>
            {generatingMsg && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Icon name="Loader2" size={12} className="animate-spin" /> Генерирую...
              </div>
            )}
            {generatedMsg && (
              <div className="glass border border-white/10 rounded-xl p-3">
                <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-sans">{generatedMsg}</pre>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedMsg)}
                  className="mt-2 text-xs text-violet-400 hover:underline flex items-center gap-1">
                  <Icon name="Copy" size={10} /> Копировать
                </button>
              </div>
            )}
          </div>

          {/* Следующее действие */}
          {prospect.next_action && (
            <div className="glass border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
              <Icon name="Clock" size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-amber-300 font-semibold">Следующее действие</div>
                <div className="text-xs text-white/70 mt-0.5">{prospect.next_action}</div>
                {prospect.next_action_date && (
                  <div className="text-xs text-white/30 mt-0.5">{prospect.next_action_date}</div>
                )}
              </div>
            </div>
          )}

          {prospect.note && (
            <div className="text-xs text-white/50 leading-relaxed border-l-2 border-white/10 pl-3">{prospect.note}</div>
          )}

          {/* Добавить активность */}
          <QuickActivity onAdd={onAddActivity} />

          {/* История */}
          {activities.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-white/40 uppercase tracking-wider">История</span>
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full glass border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name={(ACTIVITY_ICONS[a.activity_type] || "FileText") as "Mail"} size={10} className="text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 leading-relaxed">{a.content}</div>
                    <div className="text-white/25 mt-0.5">{new Date(a.created_at).toLocaleString('ru')}</div>
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
      <span className="text-xs text-white/40 uppercase tracking-wider">Добавить активность</span>
      <div className="flex gap-2">
        {[
          { key: "note", label: "Заметка", icon: "FileText" },
          { key: "call", label: "Звонок", icon: "Phone" },
          { key: "email", label: "Email", icon: "Mail" },
          { key: "meeting", label: "Встреча", icon: "Users" },
        ].map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all ${type === t.key ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/40"}`}>
            <Icon name={t.icon as "Mail"} size={10} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Что сделано / что планируется..."
          className="flex-1 glass border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
        <button onClick={submit} disabled={!text.trim()}
          className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs transition-all">
          <Icon name="Plus" size={12} />
        </button>
      </div>
    </div>
  );
}

