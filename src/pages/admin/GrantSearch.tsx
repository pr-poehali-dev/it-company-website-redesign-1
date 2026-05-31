import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const GRANTS_URL = "https://functions.poehali.dev/cd9f10b6-bd2b-4156-afc1-6aeb89fdbe43";

interface Grant {
  id: string;
  name: string;
  fund: string;
  amount_fmt: string;
  category: string;
  deadline: string;
  region: string;
  url: string;
  description: string;
  matched_product: string;
  fit_score?: number;
  why_fit?: string;
  source?: string;
  saved?: boolean;
}

interface Fund {
  key: string;
  name: string;
  icon: string;
  category: string;
  amount_hint: string;
  desc: string;
  url: string;
}

interface SavedGrant extends Grant {
  db_id?: number;
  external_id: string;
  note: string;
  analysis: GrantAnalysis | null;
  created_at: string;
}

interface GrantAnalysis {
  fit_score: number;
  win_probability: number;
  fit_comment: string;
  best_product: string;
  win_factors: string[];
  risks: string[];
  required_docs: string[];
  application_structure: { title: string; sections: { title: string; content: string }[] };
  budget_hint: string;
  timeline: string;
  conclusion: string;
}

type Tab = "search" | "funds" | "saved";

const QUICK = [
  "гранты на EdTech и образование",
  "импортозамещение российского ПО",
  "гранты на искусственный интеллект",
  "агротех и цифровизация АПК",
  "гранты для стартапов до 30 лет",
  "субсидии на промышленное ПО",
];

function score(s?: number) {
  if (s == null) return "text-white/40";
  return s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-red-400";
}

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

function GrantCard({
  g,
  onAnalyze,
  onSave,
  expanded,
  analysis,
  analyzing,
}: {
  g: Grant;
  onAnalyze: () => void;
  onSave: () => void;
  expanded: boolean;
  analysis: GrantAnalysis | null;
  analyzing: boolean;
}) {
  return (
    <div className="glass border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-white">{g.name}</h3>
            {g.fit_score != null && (
              <span className={`text-xs font-bold ${score(g.fit_score)}`}>{g.fit_score}% подходит</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
            <span className="text-white/60 flex items-center gap-1">
              <Icon name="Building2" size={12} />
              {g.fund}
            </span>
            {g.amount_fmt && (
              <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">{g.amount_fmt}</span>
            )}
            {g.category && <span className="text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full">{g.category}</span>}
            {g.deadline && (
              <span className="text-amber-300 flex items-center gap-1">
                <Icon name="Clock" size={12} />
                {g.deadline}
              </span>
            )}
          </div>
          <p className="text-white/55 text-sm leading-relaxed mb-2">{g.description}</p>
          {g.matched_product && (
            <p className="text-xs text-cyan-300 flex items-center gap-1">
              <Icon name="Boxes" size={12} />
              Наш продукт: <b className="text-cyan-200">{g.matched_product}</b>
            </p>
          )}
          {g.why_fit && <p className="text-xs text-white/40 mt-1 italic">{g.why_fit}</p>}
        </div>
        <button
          onClick={onSave}
          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            g.saved ? "bg-violet-600 text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
          }`}
          title={g.saved ? "В избранном" : "Сохранить"}
        >
          <Icon name={g.saved ? "BookmarkCheck" : "Bookmark"} size={16} />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onAnalyze}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 text-sm font-medium transition-all"
        >
          <Icon name="BrainCircuit" size={14} />
          ИИ-анализ заявки
        </button>
        {g.url && (
          <a
            href={g.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/15 text-white/70 hover:text-white text-sm font-medium transition-all"
          >
            <Icon name="ExternalLink" size={14} />
            Перейти к гранту
          </a>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {analyzing && (
            <div className="flex items-center text-white/40 text-sm py-4">
              <Icon name="Loader2" size={18} className="animate-spin mr-2" />
              ИИ анализирует шансы и готовит структуру заявки...
            </div>
          )}
          {!analyzing && analysis && <AnalysisView a={analysis} />}
        </div>
      )}
    </div>
  );
}

function AnalysisView({ a }: { a: GrantAnalysis }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-white/40">Соответствие</p>
          <p className={`text-2xl font-bold ${score(a.fit_score)}`}>{a.fit_score}%</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Шанс выиграть</p>
          <p className={`text-2xl font-bold ${score(a.win_probability)}`}>{a.win_probability}%</p>
        </div>
      </div>

      {a.fit_comment && <p className="text-white/70">{a.fit_comment}</p>}
      {a.best_product && (
        <p className="text-cyan-300">
          <b>Заявлять продукт:</b> {a.best_product}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {a.win_factors?.length > 0 && (
          <div>
            <p className="text-emerald-300 font-medium mb-1 flex items-center gap-1">
              <Icon name="TrendingUp" size={14} /> Сильные стороны
            </p>
            <ul className="space-y-1">
              {a.win_factors.map((f, i) => (
                <li key={i} className="text-white/60 flex gap-1.5">
                  <span className="text-emerald-400">+</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
        {a.risks?.length > 0 && (
          <div>
            <p className="text-amber-300 font-medium mb-1 flex items-center gap-1">
              <Icon name="AlertTriangle" size={14} /> Риски
            </p>
            <ul className="space-y-1">
              {a.risks.map((r, i) => (
                <li key={i} className="text-white/60 flex gap-1.5">
                  <span className="text-amber-400">!</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {a.required_docs?.length > 0 && (
        <div>
          <p className="text-white/80 font-medium mb-1">Нужные документы</p>
          <div className="flex flex-wrap gap-2">
            {a.required_docs.map((d, i) => (
              <span key={i} className="text-xs bg-white/5 text-white/60 px-2 py-1 rounded-lg">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {a.application_structure?.sections?.length > 0 && (
        <div>
          <p className="text-white/80 font-medium mb-2">
            Структура заявки: <span className="text-violet-300">{a.application_structure.title}</span>
          </p>
          <div className="space-y-2">
            {a.application_structure.sections.map((s, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-3">
                <p className="text-white/90 font-medium text-xs mb-1">{s.title}</p>
                <p className="text-white/55 text-xs leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {a.budget_hint && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 mb-1">Обоснование бюджета</p>
            <p className="text-white/70 text-xs">{a.budget_hint}</p>
          </div>
        )}
        {a.timeline && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 mb-1">Сроки реализации</p>
            <p className="text-white/70 text-xs">{a.timeline}</p>
          </div>
        )}
      </div>

      {a.conclusion && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
          <p className="text-xs text-violet-300 mb-1 font-medium">Рекомендация ИИ</p>
          <p className="text-white/80 text-sm">{a.conclusion}</p>
        </div>
      )}
    </div>
  );
}
