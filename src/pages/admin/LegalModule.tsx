import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import LegalChat from "./legal/LegalChat";
import ContractAnalyzer from "./legal/ContractAnalyzer";
import StrategyView from "./legal/StrategyView";
import DocGenerator from "./legal/DocGenerator";
import {
  LEGAL_URL, LegalCase, LegalMessage, LegalDocument,
  CASE_TYPES, CASE_STATUSES, statusInfo, fmtMoney,
} from "./legal/types";

type Tab = "chat" | "strategy" | "docs" | "contract";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "chat", label: "Консультация", icon: "MessagesSquare" },
  { id: "strategy", label: "Стратегия", icon: "Target" },
  { id: "docs", label: "Документы", icon: "FileText" },
  { id: "contract", label: "Анализ договора", icon: "ScanSearch" },
];

export default function LegalModule({ token }: { token: string }) {
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeCase, setActiveCase] = useState<LegalCase | null>(null);
  const [messages, setMessages] = useState<LegalMessage[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [tab, setTab] = useState<Tab>("chat");
  const [loading, setLoading] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", case_type: "debt", opponent: "", opponent_inn: "", amount: "", description: "",
  });

  const api = useCallback(
    async (payload: object) => {
      const res = await fetch(LEGAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    [token],
  );

  const loadCases = useCallback(async () => {
    const d = await api({ action: "legal_cases" });
    setCases(d.cases || []);
  }, [api]);

  const loadCase = useCallback(
    async (id: number) => {
      setLoading(true);
      const d = await api({ action: "legal_case", id });
      setActiveCase(d.case || null);
      setMessages(d.messages || []);
      setDocuments(d.documents || []);
      setLoading(false);
    },
    [api],
  );

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (activeId) loadCase(activeId);
  }, [activeId, loadCase]);

  async function createCase() {
    if (!form.title.trim()) return;
    const d = await api({
      action: "legal_case_create",
      ...form,
      amount: Number(form.amount) || 0,
    });
    if (d.case) {
      setShowForm(false);
      setForm({ title: "", case_type: "debt", opponent: "", opponent_inn: "", amount: "", description: "" });
      await loadCases();
      setActiveId(d.case.id);
    }
  }

  async function changeStatus(status: string) {
    if (!activeId) return;
    await api({ action: "legal_case_update", id: activeId, status });
    await loadCases();
    await loadCase(activeId);
  }

  async function buildStrategy() {
    if (!activeId) return;
    setStrategyLoading(true);
    const d = await api({ action: "legal_strategy", case_id: activeId });
    if (d.strategy) setActiveCase(prev => (prev ? { ...prev, strategy: d.strategy } : prev));
    setStrategyLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="glass neon-border rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Icon name="Scale" size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-oswald font-bold text-white">ИИ-юрист</h2>
              <p className="text-xs text-white/40">
                Споры с контрагентами, взыскание долгов, договоры и документы
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
          >
            <Icon name="Plus" size={14} /> Новое дело
          </button>
        </div>

        {showForm && (
          <div className="mt-4 pt-4 border-t border-white/10 grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Название дела, напр. «Долг ООО Ромашка»"
                className="glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
              <select
                value={form.case_type}
                onChange={e => setForm({ ...form, case_type: e.target.value })}
                className="glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white bg-transparent focus:outline-none"
              >
                {Object.entries(CASE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                value={form.opponent}
                onChange={e => setForm({ ...form, opponent: e.target.value })}
                placeholder="Контрагент (кто должен)"
                className="glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
              <input
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="Сумма долга, ₽"
                inputMode="numeric"
                className="glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Что произошло: договор, работы, что не оплатили, переписка, сроки..."
              className="glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-y"
            />
            <button
              onClick={createCase}
              disabled={!form.title.trim()}
              className="self-start px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
            >
              Создать дело
            </button>
          </div>
        )}
      </div>

      {/* Список дел */}
      {cases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveId(null); setActiveCase(null); setMessages([]); setDocuments([]); }}
            className={`text-xs px-3 py-2 rounded-xl border transition-all ${
              !activeId ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/40 hover:text-white"
            }`}
          >
            Общая консультация
          </button>
          {cases.map(c => {
            const si = statusInfo(c.status);
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`text-xs px-3 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                  activeId === c.id ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {c.title}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${si.cls}`}>{si.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Карточка дела */}
      {activeCase && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-white mb-1">{activeCase.title}</h3>
              <div className="flex items-center gap-3 flex-wrap text-xs text-white/50">
                <span>{CASE_TYPES[activeCase.case_type] || activeCase.case_type}</span>
                {activeCase.opponent && (
                  <span className="flex items-center gap-1">
                    <Icon name="Building2" size={12} /> {activeCase.opponent}
                  </span>
                )}
                {Number(activeCase.amount) > 0 && (
                  <span className="text-emerald-300 font-medium">{fmtMoney(activeCase.amount)}</span>
                )}
              </div>
            </div>
            <select
              value={activeCase.status}
              onChange={e => changeStatus(e.target.value)}
              className="glass border border-white/10 rounded-xl px-3 py-2 text-xs text-white bg-transparent focus:outline-none"
            >
              {CASE_STATUSES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          {activeCase.description && (
            <p className="text-sm text-white/55 mt-3 leading-relaxed">{activeCase.description}</p>
          )}
        </div>
      )}

      {/* Вкладки */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              tab === t.id
                ? "border-violet-500/50 bg-violet-500/10 text-white"
                : "glass border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <Icon name={t.icon as "Scale"} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Icon name="Loader2" size={16} className="animate-spin" /> Загружаю дело...
        </div>
      )}

      {tab === "chat" && (
        <div className="glass border border-white/10 rounded-2xl p-5">
          <LegalChat token={token} caseId={activeId} initialMessages={messages} />
        </div>
      )}

      {tab === "contract" && <ContractAnalyzer token={token} caseId={activeId} />}

      {tab === "docs" && (
        <DocGenerator
          token={token}
          caseId={activeId}
          documents={documents}
          onCreated={() => activeId && loadCase(activeId)}
        />
      )}

      {tab === "strategy" && (
        <div className="space-y-4">
          {!activeId ? (
            <div className="glass border border-white/10 rounded-2xl p-8 text-center text-white/45 text-sm">
              Выберите дело или создайте новое — построю стратегию взыскания
            </div>
          ) : (
            <>
              <button
                onClick={buildStrategy}
                disabled={strategyLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
              >
                {strategyLoading ? (
                  <>
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    Оцениваю перспективы дела...
                  </>
                ) : (
                  <>
                    <Icon name="Target" size={14} />
                    {activeCase?.strategy ? "Пересчитать стратегию" : "Построить стратегию"}
                  </>
                )}
              </button>
              {activeCase?.strategy && <StrategyView s={activeCase.strategy} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
