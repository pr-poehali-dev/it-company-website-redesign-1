import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { AUTO_EMAILER_URL, ActionBtn, InfoBlock, ResultErr, ResultOk, SectionTitle } from "./automation-ui";

interface PainSolution {
  pain: string;
  solution: string;
}

interface Segment {
  key: string;
  title: string;
  product: string;
  subject: string;
  total: number;
  not_sent: number;
  pains: PainSolution[];
}

interface SendDetail {
  prospect_id: number;
  ok: boolean;
  company?: string;
  sent_to?: string;
  error?: string;
}

export default function TabSegments({ token }: { token: string }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendingKey, setSendingKey] = useState("");
  const [result, setResult] = useState<Record<string, { sent: number; skipped: number; details: SendDetail[]; message?: string }>>({});

  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function sendTest() {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "test_email", email: testEmail.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        const via = data.provider === "unisender" ? "Unisender Go" : "Яндекс SMTP";
        setTestResult({ ok: true, text: `Отправлено на ${data.sent_to} через ${via}. Проверьте входящие и папку «Спам».` });
      } else {
        setTestResult({ ok: false, text: data.error || "Не удалось отправить" });
      }
    } catch {
      setTestResult({ ok: false, text: "Ошибка соединения" });
    } finally {
      setTesting(false);
    }
  }

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "segments_stats" }),
      });
      const data = await res.json();
      if (data.ok) setSegments(data.segments ?? []);
      else setError(data.error ?? "Не удалось загрузить группы");
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function sendSegment(key: string) {
    setSendingKey(key);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "batch_segment", segment: key, limit: 30 }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(prev => ({ ...prev, [key]: { sent: data.sent ?? 0, skipped: data.skipped ?? 0, details: data.details ?? [], message: data.message } }));
        loadStats();
      } else {
        setResult(prev => ({ ...prev, [key]: { sent: 0, skipped: 0, details: [], message: data.error } }));
      }
    } catch {
      setResult(prev => ({ ...prev, [key]: { sent: 0, skipped: 0, details: [], message: "Ошибка соединения" } }));
    } finally {
      setSendingKey("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <SectionTitle icon="LayoutGrid">Группы клиентов — предложения «боль → решение»</SectionTitle>
          <button onClick={loadStats} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-50">
            <Icon name="RefreshCw" size={13} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>
        <InfoBlock>
          База разбита на группы по нишам. Для каждой группы — своё предложение: слева боль клиента,
          справа наше решение. Рассылка учитывает только компании с корректным email, которым ещё не писали.
        </InfoBlock>
        {error && <ResultErr>{error}</ResultErr>}
      </div>

      {/* Тест доставки писем */}
      <div className="glass border border-white/10 rounded-2xl p-6">
        <SectionTitle icon="MailCheck">Проверка доставки писем</SectionTitle>
        <InfoBlock>
          Отправьте тестовое письмо на любой адрес и убедитесь, что оно дошло.
          В ответе будет видно, через какой сервис ушло письмо.
        </InfoBlock>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendTest()}
            placeholder="email для проверки"
            className="flex-1 min-w-56 glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
          <ActionBtn onClick={sendTest} loading={testing} disabled={!testEmail.trim()} icon="Send">
            Отправить тест
          </ActionBtn>
        </div>
        {testResult && (
          <div className="mt-3">
            {testResult.ok ? <ResultOk>{testResult.text}</ResultOk> : <ResultErr>{testResult.text}</ResultErr>}
          </div>
        )}
      </div>

      {segments.map(seg => {
        const r = result[seg.key];
        return (
          <div key={seg.key} className="glass border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-oswald font-bold text-lg text-white">{seg.title}</h3>
                <p className="text-xs text-white/40 mt-0.5">Продукт: {seg.product}</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-2xl font-bold text-white">{seg.total}</div>
                  <div className="text-[11px] text-white/40">компаний</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{seg.not_sent}</div>
                  <div className="text-[11px] text-white/40">без письма</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {seg.pains.map((ps, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-200">
                    <span className="font-semibold text-red-300">Боль:</span> {ps.pain}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs text-emerald-200">
                    <span className="font-semibold text-emerald-300">Решение:</span> {ps.solution}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <ActionBtn
                onClick={() => sendSegment(seg.key)}
                loading={sendingKey === seg.key}
                disabled={seg.not_sent === 0 || (sendingKey !== "" && sendingKey !== seg.key)}
                icon="Send"
              >
                Разослать группе ({Math.min(seg.not_sent, 30)})
              </ActionBtn>
              {seg.not_sent === 0 && <span className="text-xs text-white/40">Всем в группе уже отправлено</span>}
            </div>

            {r && (
              <div className="space-y-2 pt-1">
                {r.message && <div className="text-sm text-white/60 bg-white/5 rounded-xl px-4 py-2.5">{r.message}</div>}
                {r.details.length > 0 && (
                  <>
                    <div className="text-sm text-white/70">
                      Отправлено: <strong className="text-emerald-400">{r.sent}</strong>
                      {r.skipped > 0 && <span className="text-yellow-300 ml-2">| Пропущено: {r.skipped}</span>}
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {r.details.map((d, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${d.ok ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                          <Icon name={d.ok ? "CheckCircle" : "XCircle"} size={13} className={d.ok ? "text-emerald-400" : "text-red-400"} />
                          <span className="text-white/80 truncate max-w-[45%]">{d.company}</span>
                          {d.ok
                            ? <span className="text-white/50 truncate">{d.sent_to}</span>
                            : <span className="text-red-300 truncate">{d.error}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}