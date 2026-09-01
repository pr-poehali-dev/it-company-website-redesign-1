import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { LEGAL_URL, LegalMessage, QUICK_QUESTIONS } from "./types";

export default function LegalChat({
  token,
  caseId,
  initialMessages,
}: {
  token: string;
  caseId: number | null;
  initialMessages: LegalMessage[];
}) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages.map(m => ({ role: m.role, content: m.content })));
  }, [initialMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(q?: string) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await fetch(LEGAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "legal_chat", question, case_id: caseId }),
      });
      const d = await res.json();
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: d.reply || d.error || "Не удалось получить ответ" },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Ошибка соединения" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[560px]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Icon name="Scale" size={40} className="mx-auto mb-3 text-violet-400/50" />
            <p className="text-white/50 text-sm mb-4">
              Задайте вопрос по спору — отвечу со ссылками на нормы права
            </p>
            <div className="grid gap-2 max-w-xl mx-auto">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-left text-sm glass border border-white/10 rounded-xl px-4 py-2.5 text-white/60 hover:text-white hover:border-violet-500/40 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-violet-600 text-white"
                  : "glass border border-white/10 text-white/80"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Юрист изучает вопрос и нормы права...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-white/10 mt-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          rows={2}
          placeholder="Опишите ситуацию или задайте вопрос..."
          className="flex-1 glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
        />
        <button
          onClick={() => ask()}
          disabled={loading || !input.trim()}
          className="px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all"
        >
          <Icon name="Send" size={16} />
        </button>
      </div>
    </div>
  );
}
