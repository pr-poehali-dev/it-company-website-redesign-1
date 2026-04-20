import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PROSPECTS_URL, SOURCES, SearchResult } from "./types";

interface Props {
  token: string;
  projects: { id: number; name: string; color: string }[];
  onAdd: (r: SearchResult, projectId?: number) => void;
}

export default function ProspectSearch({ token, projects, onAdd }: Props) {
  const [query, setQuery]       = useState("");
  const [region, setRegion]     = useState("");
  const [sources, setSources]   = useState<string[]>(SOURCES.map(s => s.key));
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [meta, setMeta]         = useState<{ source: string; count: number; error?: string }[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [addedInns, setAddedInns] = useState<Set<string>>(new Set());
  const [targetProject, setTargetProject] = useState<number | "">("");

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true); setError(""); setResults([]); setMeta([]);
    try {
      const res = await fetch(`${PROSPECTS_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ query: query.trim(), region, sources }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка поиска"); return; }
      setResults(data.results || []);
      setMeta(data.meta || []);
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  }

  function handleAdd(r: SearchResult) {
    const key = r.inn || r.company_name;
    setAddedInns(prev => new Set([...prev, key]));
    onAdd(r, targetProject ? Number(targetProject) : undefined);
  }

  const QUICK = ["обработка металлов", "машиностроение", "нефтегазовая отрасль",
    "строительство", "логистика", "розничная торговля", "производство"];

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="glass neon-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center flex-shrink-0">
            <Icon name="Search" size={16} className="text-violet-400" />
          </div>
          <div>
            <h3 className="font-oswald font-bold text-white">Поиск потенциальных клиентов</h3>
            <p className="text-white/40 text-xs">ЕГРЮЛ, ЕИС, Контур.Фокус, 2ГИС</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Отрасль, ОКВЭД, название, ключевое слово..."
            className="flex-1 glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
          <input
            value={region}
            onChange={e => setRegion(e.target.value)}
            placeholder="Регион (опц.)"
            className="w-36 glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
          <button
            onClick={doSearch}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center gap-2"
          >
            {loading ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Search" size={15} />}
            Найти
          </button>
        </div>

        {/* Быстрые запросы */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button key={q} onClick={() => { setQuery(q); }}
              className="text-xs px-3 py-1 glass border border-white/10 rounded-full text-white/50 hover:text-white hover:border-violet-500/40 transition-all">
              {q}
            </button>
          ))}
        </div>

        {/* Источники */}
        <div className="flex flex-wrap gap-2">
          {SOURCES.map(s => {
            const on = sources.includes(s.key);
            return (
              <button key={s.key}
                onClick={() => setSources(on ? sources.filter(k => k !== s.key) : [...sources, s.key])}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${on ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/40 hover:opacity-70"}`}>
                <Icon name={s.icon as "Search"} size={12} className={on ? s.color : "text-white/30"} />
                {s.label}
                <span className="text-white/30">{s.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Прикрепить к проекту */}
        {projects.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">Добавить в проект:</span>
            <select
              value={targetProject}
              onChange={e => setTargetProject(e.target.value === "" ? "" : Number(e.target.value))}
              className="glass border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white bg-transparent focus:outline-none focus:border-violet-500/50"
            >
              <option value="">— без проекта —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="glass border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-300 text-sm">
          <Icon name="AlertCircle" size={14} /> {error}
        </div>
      )}

      {/* Мета по источникам */}
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {meta.map((m, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs ${m.error ? "bg-red-500/10 border border-red-500/20 text-red-300" : "glass border border-white/10 text-white/50"}`}>
              {m.error ? <Icon name="AlertTriangle" size={11} /> : <Icon name="CheckCircle" size={11} className="text-emerald-400" />}
              {m.source}: <span className="text-white font-medium">{m.count}</span>
            </div>
          ))}
          <div className="px-3 py-1.5 text-xs text-white/40">
            Итого: <span className="text-white font-semibold">{results.length}</span> компаний
          </div>
        </div>
      )}

      {/* Результаты */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => {
            const key = r.inn || r.company_name;
            const added = addedInns.has(key);
            return (
              <div key={i} className="glass border border-white/10 rounded-xl p-4 flex items-start gap-4 hover:border-violet-500/30 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="font-semibold text-white text-sm leading-tight">{r.company_name}</div>
                    {r.inn && <span className="text-xs text-white/30 font-mono">ИНН: {r.inn}</span>}
                    <span className="text-xs px-2 py-0.5 glass border border-white/10 rounded-full text-white/40">{r.source}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-white/40">
                    {r.industry && <span><Icon name="Tag" size={10} className="inline mr-1" />{r.industry}</span>}
                    {r.region && <span><Icon name="MapPin" size={10} className="inline mr-1" />{r.region}</span>}
                    {r.email && <span><Icon name="Mail" size={10} className="inline mr-1" />{r.email}</span>}
                    {r.phone && <span><Icon name="Phone" size={10} className="inline mr-1" />{r.phone}</span>}
                    {r.website && (
                      <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
                        target="_blank" rel="noreferrer"
                        className="text-violet-400 hover:underline">
                        <Icon name="Globe" size={10} className="inline mr-1" />{r.website}
                      </a>
                    )}
                    {r.employee_count && <span><Icon name="Users" size={10} className="inline mr-1" />{r.employee_count} чел.</span>}
                    {r.address && <span className="max-w-xs truncate">{r.address}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(r)}
                  disabled={added}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${added ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default" : "bg-violet-600 hover:bg-violet-500 text-white"}`}
                >
                  <Icon name={added ? "Check" : "Plus"} size={12} />
                  {added ? "Добавлен" : "В CRM"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && meta.length > 0 && (
        <div className="text-center py-10 text-white/30 text-sm">Ничего не найдено. Попробуйте другой запрос или источники.</div>
      )}
    </div>
  );
}