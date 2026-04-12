import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/762d515a-ff32-4d7f-a30f-f5015a70496a";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Stage = "chat" | "sending" | "sent";

export default function Consultant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("chat");
  const [readyToSend, setReadyToSend] = useState(false);
  const [brief, setBrief] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Приветственное сообщение
    setMessages([
      {
        role: "assistant",
        content:
          "Здравствуйте! Меня зовут Алекс, я консультант компании МАТ-Лабс. Помогу разобраться с вашей задачей и подготовить техническое задание для нашей команды.\n\nРасскажите, пожалуйста, чем занимается ваш бизнес и что вы хотите создать?",
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch(`${API_URL}?action=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...newMessages, { role: "assistant", content: data.content }]);
        if (data.ready_to_send) setReadyToSend(true);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Произошла ошибка. Попробуйте ещё раз." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendBrief = async () => {
    setStage("sending");
    const clientNameMsg = messages.find((m) => m.role === "user");
    const clientName = clientNameMsg?.content.slice(0, 40) || "Клиент";

    try {
      const res = await fetch(`${API_URL}?action=send_brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, client_name: clientName }),
      });
      const data = await res.json();
      if (data.success) {
        setBrief(data.brief);
        setStage("sent");
      } else {
        setStage("chat");
        alert("Ошибка отправки: " + data.error);
      }
    } catch {
      setStage("chat");
      alert("Ошибка отправки. Проверьте настройки почты.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  if (stage === "sent") {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Icon name="CheckCircle" size={40} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">ТЗ успешно отправлено!</h2>
          <p className="text-gray-400 mb-8">
            Наш менеджер получил техническое задание и свяжется с вами в течение 2 часов.
          </p>
          <div className="bg-[#161b22] border border-white/10 rounded-xl p-6 text-left">
            <h3 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">
              Сформированное ТЗ
            </h3>
            <pre className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {brief}
            </pre>
          </div>
          <button
            onClick={() => {
              setMessages([
                {
                  role: "assistant",
                  content:
                    "Здравствуйте! Меня зовут Алекс, я консультант компании МАТ-Лабс. Расскажите о вашем проекте?",
                },
              ]);
              setStage("chat");
              setReadyToSend(false);
              setBrief("");
            }}
            className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-colors"
          >
            Новая консультация
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1117]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            А
          </div>
          <div>
            <div className="font-semibold text-white">Алекс</div>
            <div className="text-xs text-cyan-400">IT-консультант · МАТ-Лабс</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400">Онлайн</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1">
                  А
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-cyan-500 text-black rounded-br-sm font-medium"
                    : "bg-[#161b22] text-gray-200 border border-white/10 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm shrink-0 mt-1">
                  <Icon name="User" size={16} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                А
              </div>
              <div className="bg-[#161b22] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {readyToSend && stage === "chat" && (
            <div className="flex justify-center py-2">
              <div className="bg-[#161b22] border border-cyan-500/30 rounded-2xl p-4 max-w-sm w-full text-center">
                <Icon name="FileText" size={28} className="text-cyan-400 mx-auto mb-2" />
                <p className="text-white font-semibold text-sm mb-1">ТЗ готово к отправке</p>
                <p className="text-gray-400 text-xs mb-4">
                  Алекс собрал всю необходимую информацию. Отправить ТЗ администратору?
                </p>
                <button
                  onClick={sendBrief}
                  disabled={stage === "sending"}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {stage === "sending" ? "Отправляем..." : "Отправить ТЗ администратору"}
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-[#0d1117]/95 backdrop-blur sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-end bg-[#161b22] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-cyan-500/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm leading-relaxed"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/10 disabled:text-gray-600 text-black flex items-center justify-center transition-colors shrink-0"
            >
              <Icon name="Send" size={16} />
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            Enter — отправить · Shift+Enter — новая строка
          </p>
        </div>
      </div>
    </div>
  );
}
