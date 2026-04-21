import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { CONTACT_REQUESTS_URL } from "./types";

interface ContactRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  message: string;
  created_at: string;
}

export default function ContactRequests({ token }: { token: string }) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactRequest | null>(null);

  useEffect(() => {
    fetch(`${CONTACT_REQUESTS_URL}/`, { headers: { "X-Session-Token": token } })
      .then(r => r.json())
      .then(d => setRequests(d.requests || []))
      .finally(() => setLoading(false));
  }, [token]);

  function formatDate(dt: string) {
    return new Date(dt).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <Icon name="Mail" size={20} className="text-violet-400" />
        </div>
        <div>
          <h2 className="font-oswald text-2xl font-bold text-white">Заявки с сайта</h2>
          <p className="text-white/40 text-sm">{requests.length} заявок</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Icon name="Loader2" size={24} className="animate-spin mr-3" />
          Загрузка...
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-center py-20 text-white/40">
          <Icon name="MailOpen" size={48} className="mx-auto mb-4 opacity-30" />
          <p>Заявок пока нет</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="grid gap-4">
          {requests.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="glass border border-white/10 hover:border-violet-500/40 rounded-2xl p-5 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-white">{r.name}</span>
                    {r.company && (
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{r.company}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/50 mb-3">
                    <span className="flex items-center gap-1">
                      <Icon name="Mail" size={12} />
                      {r.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="Phone" size={12} />
                      {r.phone}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm line-clamp-2">{r.message}</p>
                </div>
                <span className="text-xs text-white/30 whitespace-nowrap flex-shrink-0">{formatDate(r.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative glass neon-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-oswald text-xl font-bold text-white">Заявка #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Имя</p>
                  <p className="text-white font-medium">{selected.name}</p>
                </div>
                {selected.company && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Компания</p>
                    <p className="text-white font-medium">{selected.company}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Email</p>
                <a href={`mailto:${selected.email}`} className="text-violet-400 hover:text-violet-300 transition-colors">
                  {selected.email}
                </a>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Телефон</p>
                <a href={`tel:${selected.phone}`} className="text-violet-400 hover:text-violet-300 transition-colors">
                  {selected.phone}
                </a>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-2">Сообщение</p>
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap bg-white/5 rounded-xl p-4">
                  {selected.message}
                </p>
              </div>
              <p className="text-xs text-white/30">{formatDate(selected.created_at)}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <a
                href={`mailto:${selected.email}`}
                className="flex-1 btn-gradient text-white text-sm font-medium py-2.5 rounded-xl text-center transition-all"
              >
                Написать письмо
              </a>
              <a
                href={`tel:${selected.phone}`}
                className="flex-1 glass border border-white/20 text-white/70 hover:text-white text-sm font-medium py-2.5 rounded-xl text-center transition-all"
              >
                Позвонить
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
