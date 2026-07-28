import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { AUTO_EMAILER_URL, ActionBtn, InfoBlock, ResultErr, SectionTitle } from "./automation-ui";

interface SentItem {
  id: number;
  prospect_id: number;
  company_name: string;
  email: string;
  subject: string;
  created_at: string;
}

interface BatchDetail {
  prospect_id: number;
  ok: boolean;
  sent_to?: string;
  subject?: string;
  error?: string;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TabEmailer({ token }: { token: string }) {
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchDetails, setBatchDetails] = useState<BatchDetail[] | null>(null);
  const [batchError, setBatchError] = useState("");

  const [singleId, setSingleId] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<{ ok: boolean; subject?: string; sent_to?: string; error?: string } | null>(null);

  const [log, setLog] = useState<SentItem[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(false);

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "sent_log", limit: 50 }),
      });
      const data = await res.json();
      if (data.ok) {
        setLog(data.items ?? []);
        setLogTotal(data.total ?? 0);
      }
    } catch {
      /* silent */
    } finally {
      setLogLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  async function runBatch() {
    setBatchLoading(true);
    setBatchError("");
    setBatchDetails(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "batch_send" }),
      });
      const data = await res.json();
      if (data.ok) setBatchDetails(data.details ?? []);
      else setBatchError(data.error ?? "Неизвестная ошибка");
    } catch {
      setBatchError("Ошибка соединения");
    } finally {
      setBatchLoading(false);
      loadLog();
    }
  }

  async function runSingle() {
    const id = parseInt(singleId);
    if (!id) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "send_intro", prospect_id: id }),
      });
      const data = await res.json();
      setSingleResult(data);
    } catch {
      setSingleResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setSingleLoading(false);
      loadLog();
    }
  }

  const batchSent = batchDetails?.filter(d => d.ok).length ?? 0;
  const batchFailed = batchDetails?.filter(d => !d.ok).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="Send">Пакетная рассылка</SectionTitle>
        <InfoBlock>
          Отправляет персональное письмо каждому новому лиду с email. Письмо генерируется AI
          на основе отрасли и сайта компании. Обрабатывает до 20 лидов за раз.
        </InfoBlock>
        <div className="flex flex-wrap items-center gap-3">
          <ActionBtn onClick={runBatch} loading={batchLoading} icon="Send">
            Запустить пакетную рассылку
          </ActionBtn>
          {batchLoading && (
            <span className="text-sm text-violet-300 flex items-center gap-2">
              <Icon name="Loader2" size={14} className="animate-spin" />
              Идёт отправка писем…
            </span>
          )}
          {batchError && <ResultErr>{batchError}</ResultErr>}
        </div>

        {batchDetails && (
          <div className="mt-4 space-y-2">
            <div className="text-sm text-white/70">
              Отправлено: <strong className="text-emerald-400">{batchSent}</strong>
              {batchFailed > 0 && <span className="text-yellow-300 ml-2">| Ошибок: {batchFailed}</span>}
            </div>
            <div className="space-y-1.5">
              {batchDetails.map((d, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${d.ok ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <Icon name={d.ok ? "CheckCircle" : "XCircle"} size={13} className={d.ok ? "text-emerald-400" : "text-red-400"} />
                  <span className="text-white/50">ID {d.prospect_id}</span>
                  {d.ok ? (
                    <>
                      <span className="text-white/80 truncate">{d.sent_to}</span>
                      <span className="text-white/40 truncate hidden sm:inline">— {d.subject}</span>
                    </>
                  ) : (
                    <span className="text-red-300 truncate">{d.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="Mail">Отправить конкретному лиду</SectionTitle>
        <InfoBlock>
          Введите ID лида из CRM для отправки персонализированного вводного письма.
        </InfoBlock>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            value={singleId}
            onChange={e => setSingleId(e.target.value)}
            placeholder="ID лида"
            className="w-36 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
          />
          <ActionBtn onClick={runSingle} loading={singleLoading} disabled={!singleId} icon="Mail">
            Отправить
          </ActionBtn>
        </div>
        {singleResult && (
          <div className="mt-4">
            {singleResult.ok ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <Icon name="CheckCircle" size={14} />
                  Письмо отправлено
                </div>
                {singleResult.sent_to && (
                  <div className="text-xs text-white/50">
                    Получатель: <span className="text-white/80">{singleResult.sent_to}</span>
                  </div>
                )}
                {singleResult.subject && (
                  <div className="text-xs text-white/50">
                    Тема: <span className="text-white/80">{singleResult.subject}</span>
                  </div>
                )}
              </div>
            ) : (
              <ResultErr>{singleResult.error ?? "Ошибка отправки"}</ResultErr>
            )}
          </div>
        )}
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon="History">Журнал отправленных писем</SectionTitle>
          <button onClick={loadLog} disabled={logLoading}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-50">
            <Icon name="RefreshCw" size={13} className={logLoading ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>
        <div className="text-xs text-white/40 mb-3">
          Всего отправлено писем: <strong className="text-white/70">{logTotal}</strong>
        </div>

        {log.length === 0 ? (
          <div className="text-sm text-white/30 text-center py-6">
            Писем пока нет — запустите рассылку выше
          </div>
        ) : (
          <div className="space-y-2">
            {log.map(item => (
              <div key={item.id} className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-3">
                <Icon name="MailCheck" size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium truncate">{item.company_name}</span>
                    <span className="text-xs text-white/40">{item.email}</span>
                  </div>
                  <div className="text-xs text-white/50 truncate mt-0.5">{item.subject}</div>
                </div>
                <span className="text-xs text-white/30 flex-shrink-0 whitespace-nowrap">{fmtDate(item.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
