import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { GRANTS_URL, ChatMessage, Grant, SavedGrant } from "./types";
import { exportApplicationToWord } from "./exportWord";

const SUGGESTIONS = [
  "Помоги сформулировать актуальность проблемы",
  "Как описать научно-техническую новизну проекта?",
  "Составь план-график реализации проекта",
  "Как обосновать запрашиваемый бюджет?",
  "Какие KPI и результаты указать в заявке?",
  "Проверь и улучши мой текст заявки",
];

export default function GrantChat({
  token,
  savedGrants,
}: {
  token: string;
  savedGrants: SavedGrant[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [grantId, setGrantId] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  const headers = { "Content-Type": "application/json", "X-Session-Token": token };
  const grantCtx: Grant | undefined = savedGrants.find((g) => g.external_id === grantId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    const body = JSON.stringify({
      messages: next,
      grant: grantCtx
        ? {
            name: grantCtx.name,
            fund: grantCtx.fund,
            amount_fmt: grantCtx.amount_fmt,
            category: grantCtx.category,
            deadline: grantCtx.deadline,
            description: grantCtx.description,
            matched_product: grantCtx.matched_product,
          }
        : undefined,
    });

    async function attempt() {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 55000);
      try {
        return await fetch(`${GRANTS_URL}/chat`, {
          method: "POST",
          headers,
          signal: controller.signal,
          body,
        });
      } finally {
        clearTimeout(timer);
      }
    }

    try {
      let r: Response;
      try {
        r = await attempt();
      } catch (e) {
        // Разовый сбой сети — пробуем ещё раз через секунду (таймаут не повторяем)
        if (e instanceof DOMException && e.name === "AbortError") throw e;
        await new Promise((res) => setTimeout(res, 1000));
        r = await attempt();
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || `Ошибка сервера (${r.status})`);
        return;
      }
      if (!d.reply) {
        setError("Помощник не вернул ответ, попробуйте переформулировать вопрос");
        return;
      }
      setMessages((p) => [...p, { role: "assistant", content: d.reply }]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Ответ готовится слишком долго. Сформулируйте вопрос короче и попробуйте снова");
      } else {
        setError("Не удалось связаться с помощником. Проверьте интернет и попробуйте ещё раз");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass border border-white/10 rounded-2xl flex flex-col h-[calc(100vh-280px)] min-h-[420px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
          <Icon name="MessageSquareText" fallback="MessageSquare" size={18} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm">Помощник по заявкам</p>
          <p className="text-white/40 text-xs">Эксперт по грантам и конкурсам РФ</p>
        </div>
        <select
          value={grantId}
          onChange={(e) => setGrantId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 outline-none focus:border-violet-500/50 max-w-[180px]"
          title="Привязать чат к гранту из избранного"
        >
          <option value="">Без привязки к гранту</option>
          {savedGrants.map((g) => (
            <option key={g.external_id} value={g.external_id} className="bg-[#1a1330]">
              {g.name}
            </option>
          ))}
        </select>
        {messages.some((m) => m.role === "assistant") && (
          <button
            onClick={() => exportApplicationToWord(messages, grantCtx?.name)}
            className="flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-all"
            title="Скачать ответы помощника в Word"
          >
            <Icon name="FileDown" size={15} />
            Скачать заявку
          </button>
        )}
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setError("");
            }}
            className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
            title="Очистить чат"
          >
            <Icon name="Trash2" size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Icon name="Sparkles" size={36} className="text-violet-400/50 mb-3" />
            <p className="text-white/60 text-sm max-w-md mb-4">
              Задайте вопрос по заявке — помогу с формулировками, новизной, бюджетом, планом и
              требованиями грантодателя.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-white/5 border border-white/10 text-white/85"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2 text-white/50 text-sm">
              <Icon name="Loader2" size={16} className="animate-spin" />
              Готовлю ответ...
            </div>
          </div>
        )}

        {error && (
          <div className="glass border border-red-500/30 bg-red-500/5 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Опишите задачу или вставьте текст заявки..."
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-violet-500/50 outline-none text-sm max-h-32"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="btn-gradient px-4 py-3 rounded-xl text-white font-semibold flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <Icon name="Send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}