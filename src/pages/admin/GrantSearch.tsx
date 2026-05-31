import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import GrantCard from "./grant/GrantCard";
import GrantChat from "./grant/GrantChat";
import { GRANTS_URL, QUICK, Grant, Fund, SavedGrant, GrantAnalysis, Tab } from "./grant/types";

export default function GrantSearch({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [saved, setSaved] = useState<SavedGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Grant | null>(null);
  const [analysis, setAnalysis] = useState<GrantAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const headers = { "Content-Type": "application/json", "X-Session-Token": token };

  useEffect(() => {
    if (tab === "funds" && funds.length === 0) loadFunds();
    if (tab === "saved") loadSaved();
    if (tab === "chat" && saved.length === 0) loadSaved();
  }, [tab]);

  async function loadFunds() {
    const r = await fetch(`${GRANTS_URL}/funds`, { headers: { "X-Session-Token": token } });
    const d = await r.json();
    setFunds(d.funds || []);
  }

  async function loadSaved() {
    const r = await fetch(`${GRANTS_URL}/saved`, { headers: { "X-Session-Token": token } });
    const d = await r.json();
    setSaved((d.saved || []).map((x: Record<string, unknown>) => ({ ...x, saved: true })));
  }

  async function search(q?: string) {
    const sq = (q ?? query).trim();
    if (!sq) return;
    setLoading(true);
    setError("");
    setGrants([]);
    setSelected(null);
    setAnalysis(null);
    try {
      const r = await fetch(`${GRANTS_URL}/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: sq }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Ошибка поиска");
        return;
      }
      setGrants(d.grants || []);
      if (d.funds) setFunds(d.funds);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  async function analyze(g: Grant) {
    setSelected(g);
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const r = await fetch(`${GRANTS_URL}/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({ grant: g }),
      });
      const d = await r.json();
      if (r.ok) setAnalysis(d.analysis);
    } finally {
      setAnalyzing(false);
    }
  }

  async function toggleSave(g: Grant) {
    if (g.saved) {
      await fetch(`${GRANTS_URL}/save`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ external_id: g.id, source: g.source || "ИИ-подбор" }),
      });
      setGrants((p) => p.map((x) => (x.id === g.id ? { ...x, saved: false } : x)));
      if (tab === "saved") setSaved((p) => p.filter((x) => x.external_id !== g.id));
    } else {
      await fetch(`${GRANTS_URL}/save`, {
        method: "POST",
        headers,
        body: JSON.stringify({ grant: g, analysis: selected?.id === g.id ? analysis : null }),
      });
      setGrants((p) => p.map((x) => (x.id === g.id ? { ...x, saved: true } : x)));
    }
  }

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "search", label: "ИИ-поиск грантов", icon: "Sparkles" },
    { id: "chat", label: "Помощник по заявкам", icon: "MessageSquareText" },
    { id: "funds", label: "Каталог фондов", icon: "Library", badge: funds.length || undefined },
    { id: "saved", label: "Избранное", icon: "Bookmark", badge: saved.length || undefined },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <Icon name="Award" size={20} className="text-violet-400" />
        </div>
        <div>
          <h2 className="font-oswald text-2xl font-bold text-white">Гранты и конкурсы</h2>
          <p className="text-white/40 text-sm">ИИ подбирает невозвратное финансирование под наши продукты</p>
        </div>
      </div>

      <div className="flex items-center gap-1 glass border border-white/10 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon name={t.icon as "Sparkles"} size={15} />
            {t.label}
            {t.badge !== undefined && (
              <span className="bg-white/15 text-white/80 text-xs px-1.5 py-0.5 rounded-full">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* SEARCH */}
      {tab === "search" && (
        <>
          <div className="glass border border-white/10 rounded-2xl p-5">
            <div className="flex gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Что ищем? Напр. «гранты на ИИ» или «импортозамещение ПО»"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-violet-500/50 outline-none"
              />
              <button
                onClick={() => search()}
                disabled={loading}
                className="btn-gradient px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Sparkles" size={18} />}
                {loading ? "Ищу..." : "Найти"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q);
                    search(q);
                  }}
                  className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="glass border border-red-500/30 bg-red-500/5 rounded-xl p-4 text-red-300 text-sm">{error}</div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16 text-white/40">
              <Icon name="Loader2" size={24} className="animate-spin mr-3" />
              ИИ подбирает гранты под наши продукты...
            </div>
          )}

          {!loading && grants.length > 0 && (
            <div className="grid gap-3">
              {grants.map((g) => (
                <GrantCard
                  key={g.id}
                  g={g}
                  onAnalyze={() => analyze(g)}
                  onSave={() => toggleSave(g)}
                  expanded={selected?.id === g.id}
                  analysis={selected?.id === g.id ? analysis : null}
                  analyzing={selected?.id === g.id && analyzing}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* CHAT ASSISTANT */}
      {tab === "chat" && <GrantChat token={token} savedGrants={saved} />}

      {/* FUNDS CATALOG */}
      {tab === "funds" && (
        <div className="grid md:grid-cols-2 gap-3">
          {funds.map((f) => (
            <a
              key={f.key}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="glass border border-white/10 hover:border-violet-500/40 rounded-2xl p-5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{f.name}</h3>
                    <Icon name="ExternalLink" size={14} className="text-white/30 group-hover:text-violet-400 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
                    <span className="text-xs text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full">{f.category}</span>
                    <span className="text-xs text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">{f.amount_hint}</span>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* SAVED */}
      {tab === "saved" && (
        <>
          {saved.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <Icon name="BookmarkX" fallback="Bookmark" size={48} className="mx-auto mb-4 opacity-30" />
              <p>Избранных грантов пока нет</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {saved.map((g) => (
                <GrantCard
                  key={g.external_id}
                  g={{ ...g, id: g.external_id, saved: true }}
                  onAnalyze={() => analyze({ ...g, id: g.external_id })}
                  onSave={() => toggleSave({ ...g, id: g.external_id })}
                  expanded={selected?.id === g.external_id}
                  analysis={selected?.id === g.external_id ? analysis : g.analysis}
                  analyzing={selected?.id === g.external_id && analyzing}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}