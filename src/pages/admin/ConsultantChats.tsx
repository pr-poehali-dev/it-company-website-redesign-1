import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { CONSULTANT_CHATS_URL } from "./types";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ConsultantChat {
  id: number;
  session_id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_company: string | null;
  messages: ChatMessage[];
  brief: string | null;
  is_sent: boolean;
  is_read: boolean;
  ip: string | null;
  created_at: string;
  updated_at: string;
}

export default function ConsultantChats({ token }: { token: string }) {
  const [chats, setChats] = useState<ConsultantChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConsultantChat | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${CONSULTANT_CHATS_URL}/`, { headers: { "X-Session-Token": token } });
      const d = await r.json();
      setChats(d.chats || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function markRead(id: number) {
    await fetch(`${CONSULTANT_CHATS_URL}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ id }),
    });
    setChats(prev => prev.map(c => c.id === id ? { ...c, is_read: true } : c));
  }

  function openChat(c: ConsultantChat) {
    setSelected(c);
    if (!c.is_read) markRead(c.id);
  }

  function formatDate(dt: string) {
    return new Date(dt).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function clientLabel(c: ConsultantChat) {
    if (c.client_name) return c.client_name;
    if (c.client_email) return c.client_email;
    if (c.client_phone) return c.client_phone;
    return "Аноним";
  }

  const hasContacts = (c: ConsultantChat) => Boolean(c.client_email || c.client_phone);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
            <Icon name="MessagesSquare" size={20} className="text-violet-400" />
          </div>
          <div>
            <h2 className="font-oswald text-2xl font-bold text-white">Диалоги консультанта</h2>
            <p className="text-white/40 text-sm">{chats.length} диалогов · {chats.filter(c => !c.is_read).length} новых</p>
          </div>
        </div>
        <button
          onClick={load}
          className="glass border border-white/10 hover:border-violet-500/40 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white transition-all flex items-center gap-1.5"
        >
          <Icon name="RefreshCw" size={14} />
          Обновить
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Icon name="Loader2" size={24} className="animate-spin mr-3" />
          Загрузка...
        </div>
      )}

      {!loading && chats.length === 0 && (
        <div className="text-center py-20 text-white/40">
          <Icon name="MessageCircleOff" size={48} fallback="MessagesSquare" className="mx-auto mb-4 opacity-30" />
          <p>Диалогов пока нет</p>
        </div>
      )}

      {!loading && chats.length > 0 && (
        <div className="grid gap-3">
          {chats.map(c => (
            <div
              key={c.id}
              onClick={() => openChat(c)}
              className={`glass border rounded-2xl p-4 cursor-pointer transition-all ${
                !c.is_read
                  ? "border-violet-500/50 bg-violet-500/5"
                  : "border-white/10 hover:border-violet-500/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {!c.is_read && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
                    <span className="font-semibold text-white truncate">{clientLabel(c)}</span>
                    {c.client_company && (
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{c.client_company}</span>
                    )}
                    {c.is_sent && (
                      <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Icon name="Send" size={10} />
                        ТЗ отправлено
                      </span>
                    )}
                    {!hasContacts(c) && (
                      <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Без контактов
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50 mb-2 flex-wrap">
                    {c.client_email && (
                      <span className="flex items-center gap-1">
                        <Icon name="Mail" size={11} />
                        {c.client_email}
                      </span>
                    )}
                    {c.client_phone && (
                      <span className="flex items-center gap-1">
                        <Icon name="Phone" size={11} />
                        {c.client_phone}
                      </span>
                    )}
                    <span className="text-white/30">
                      {c.messages?.length || 0} сообщ.
                    </span>
                  </div>
                  <p className="text-white/60 text-sm line-clamp-1">
                    {c.messages?.[c.messages.length - 1]?.content || ""}
                  </p>
                </div>
                <span className="text-xs text-white/30 whitespace-nowrap flex-shrink-0">{formatDate(c.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative glass neon-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-oswald text-xl font-bold text-white">Диалог #{selected.id}</h3>
                <p className="text-white/40 text-xs mt-1">{formatDate(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              <div>
                <p className="text-xs text-white/40 mb-1">Имя</p>
                <p className="text-white/90">{selected.client_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Компания</p>
                <p className="text-white/90">{selected.client_company || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Email</p>
                {selected.client_email
                  ? <a href={`mailto:${selected.client_email}`} className="text-violet-400 hover:text-violet-300">{selected.client_email}</a>
                  : <p className="text-white/30">не оставлен</p>}
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Телефон</p>
                {selected.client_phone
                  ? <a href={`tel:${selected.client_phone}`} className="text-violet-400 hover:text-violet-300">{selected.client_phone}</a>
                  : <p className="text-white/30">не оставлен</p>}
              </div>
            </div>

            {selected.brief && (
              <div className="mb-5">
                <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
                  <Icon name="FileText" size={12} />
                  Сформированное ТЗ
                </p>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-sm text-white/80 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {selected.brief}
                </div>
              </div>
            )}

            <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
              <Icon name="MessageSquare" size={12} />
              Переписка ({selected.messages?.length || 0})
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {(selected.messages || []).map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 text-sm ${
                    m.role === "user"
                      ? "bg-violet-500/10 border border-violet-500/20 ml-8"
                      : "bg-white/5 border border-white/10 mr-8"
                  }`}
                >
                  <p className={`text-xs mb-1 ${m.role === "user" ? "text-violet-300" : "text-cyan-300"}`}>
                    {m.role === "user" ? "Клиент" : "Алекс (AI)"}
                  </p>
                  <p className="text-white/80 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>

            {(selected.client_email || selected.client_phone) && (
              <div className="flex gap-3 mt-6">
                {selected.client_email && (
                  <a
                    href={`mailto:${selected.client_email}`}
                    className="flex-1 btn-gradient text-white text-sm font-medium py-2.5 rounded-xl text-center transition-all"
                  >
                    Написать письмо
                  </a>
                )}
                {selected.client_phone && (
                  <a
                    href={`tel:${selected.client_phone}`}
                    className="flex-1 glass border border-white/20 text-white/70 hover:text-white text-sm font-medium py-2.5 rounded-xl text-center transition-all"
                  >
                    Позвонить
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
