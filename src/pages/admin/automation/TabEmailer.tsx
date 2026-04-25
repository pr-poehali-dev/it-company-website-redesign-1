import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AUTO_EMAILER_URL, ActionBtn, InfoBlock, ResultErr, ResultOk, SectionTitle } from "./automation-ui";

export default function TabEmailer() {
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ sent: number; errors: unknown[] } | null>(null);
  const [batchError, setBatchError] = useState("");

  const [singleId, setSingleId] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<{ ok: boolean; subject?: string; sent_to?: string; error?: string } | null>(null);

  async function runBatch() {
    setBatchLoading(true);
    setBatchError("");
    setBatchResult(null);
    try {
      const res = await fetch(AUTO_EMAILER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch_send" }),
      });
      const data = await res.json();
      if (data.ok) setBatchResult({ sent: data.sent, errors: data.errors ?? [] });
      else setBatchError(data.error ?? "Неизвестная ошибка");
    } catch {
      setBatchError("Ошибка соединения");
    } finally {
      setBatchLoading(false);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_intro", prospect_id: id }),
      });
      const data = await res.json();
      setSingleResult(data);
    } catch {
      setSingleResult({ ok: false, error: "Ошибка соединения" });
    } finally {
      setSingleLoading(false);
    }
  }

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
          {batchResult && (
            <ResultOk>
              Отправлено: <strong>{batchResult.sent}</strong> писем
              {batchResult.errors.length > 0 && (
                <span className="text-yellow-300 ml-2">| Ошибок: {batchResult.errors.length}</span>
              )}
            </ResultOk>
          )}
          {batchError && <ResultErr>{batchError}</ResultErr>}
        </div>
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
    </div>
  );
}
