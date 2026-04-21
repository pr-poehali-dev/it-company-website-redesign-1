import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ProspectSearch from "./prospects/ProspectSearch";
import ProspectCard from "./prospects/ProspectCard";
import ProspectEdit from "./prospects/ProspectEdit";
import TechRadar from "./prospects/TechRadar";
import {
  PROSPECTS_URL, Project, Prospect, SearchResult, Activity, AiAnalysis,
  STATUSES, PRIORITIES, statusInfo, priorityInfo, scoreColor, scoreBg,
} from "./prospects/types";

export default function ProspectModule({ token }: { token: string }) {
  const [tab, setTab] = useState<"search" | "crm" | "analytics" | "radar">("search");

  // Data
  const [projects, setProjects]     = useState<Project[]>([]);
  const [prospects, setProspects]   = useState<Prospect[]>([]);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});
  const [totalProspects, setTotal]  = useState(0);
  const [loading, setLoading]       = useState(false);

  // Filters
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSearch, setFilterSearch]   = useState("");

  // Selected / Edit
  const [selected, setSelected]         = useState<Prospect | null>(null);
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [editProspect, setEditProspect] = useState<Partial<Prospect> | null>(null);
  const [isNewEdit, setIsNewEdit]       = useState(false);
  const [saving, setSaving]             = useState(false);

  // AI
  const [analyzing, setAnalyzing]       = useState(false);
  const [generatingMsg, setGenMsg]      = useState(false);
  const [generatedMsg, setGenMsgText]   = useState("");

  // Projects
  const [newProject, setNewProject]     = useState({ name: "", description: "", color: "#7c3aed" });
  const [addingProject, setAddingProject] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  useEffect(() => {
    loadProjects();
    loadProspects();
  }, []);

  useEffect(() => {
    loadProspects();
  }, [filterProject, filterStatus, filterPriority]);

  useEffect(() => {
    const t = setTimeout(() => loadProspects(), 400);
    return () => clearTimeout(t);
  }, [filterSearch]);

  async function api(action: string, method = "GET", body?: object, qparams?: Record<string, string>) {
    const payload = method === "GET"
      ? undefined
      : JSON.stringify({ action, ...body });
    const url = method === "GET"
      ? `${PROSPECTS_URL}/?action=${encodeURIComponent(action)}${qparams ? "&" + new URLSearchParams(qparams).toString() : ""}`
      : `${PROSPECTS_URL}/`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: payload,
    });
    return res.json();
  }

  async function loadProjects() {
    const data = await api("projects");
    setProjects(data.projects || []);
  }

  async function loadProspects() {
    setLoading(true);
    const qp: Record<string, string> = {};
    if (filterProject)  qp["project_id"] = filterProject;
    if (filterStatus)   qp["status"] = filterStatus;
    if (filterPriority) qp["priority"] = filterPriority;
    if (filterSearch)   qp["search"] = filterSearch;
    const data = await api("list", "GET", undefined, qp);
    setProspects(data.prospects || []);
    setStatusStats(data.status_stats || {});
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function loadActivities(id: number) {
    const data = await api("detail", "GET", undefined, { id: String(id) });
    setActivities(data.activities || []);
    setSelected(data.prospect || null);
  }

  async function addFromSearch(r: SearchResult, projectId?: number) {
    await api("create", "POST", { ...r, project_id: projectId || null });
    await loadProspects();
  }

  async function saveProspect(form: Partial<Prospect>) {
    setSaving(true);
    if (isNewEdit) {
      await api("create", "POST", form);
    } else if (editProspect?.id) {
      await api("update", "PUT", { ...form, id: editProspect.id });
      if (selected?.id === editProspect.id) await loadActivities(editProspect.id);
    }
    setEditProspect(null);
    await loadProspects();
    setSaving(false);
  }

  async function selectProspect(p: Prospect) {
    setSelected(p);
    setGenMsgText("");
    await loadActivities(p.id);
  }

  async function analyze(p: Prospect) {
    setAnalyzing(true);
    const proj = projects.find(pr => pr.id === p.project_id);
    const data = await api("analyze", "POST", {
      company: p,
      project_description: proj?.description || "",
    });
    const a: AiAnalysis = data.analysis || {};
    if (!a.error) {
      const updated = await api("update", "PUT", {
        ...p,
        ai_score: a.score,
        ai_summary: a.summary,
        ai_reasons: a.reasons || [],
        priority: a.priority || p.priority,
        next_action: a.next_action || p.next_action,
        id: p.id,
      });
      setSelected(updated.prospect || p);
      await loadProspects();
    }
    setAnalyzing(false);
  }

  async function generateMessage(type: string) {
    if (!selected) return;
    setGenMsg(true); setGenMsgText("");
    const data = await api("message", "POST", { company: selected, type });
    setGenMsgText(data.message || "");
    setGenMsg(false);
  }

  async function addActivity(type: string, content: string) {
    if (!selected) return;
    await api("activity", "POST", { prospect_id: selected.id, activity_type: type, content });
    await loadActivities(selected.id);
  }

  async function createProject() {
    if (!newProject.name.trim()) return;
    setAddingProject(true);
    await api("projects_create", "POST", newProject);
    setNewProject({ name: "", description: "", color: "#7c3aed" });
    setShowProjectForm(false);
    await loadProjects();
    setAddingProject(false);
  }

  const filtered = useMemo(() => prospects, [prospects]);

  // Analytics
  const wonCount = statusStats["won"] || 0;
  const newCount = statusStats["new"] || 0;
  const highPriority = prospects.filter(p => p.priority === "high").length;
  const avgScore = prospects.filter(p => p.ai_score !== null).length > 0
    ? Math.round(prospects.filter(p => p.ai_score !== null).reduce((s, p) => s + (p.ai_score || 0), 0) / prospects.filter(p => p.ai_score !== null).length)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Icon name="Users" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-oswald font-bold text-xl text-white">Поиск клиентов</h1>
            <p className="text-white/40 text-xs">Поиск, анализ, CRM и маркетинг</p>
          </div>
        </div>
        <div className="flex items-center gap-1 glass border border-white/10 rounded-xl p-1">
          {([
            { key: "search",    label: "Поиск",     icon: "Search" },
            { key: "crm",       label: "CRM",        icon: "LayoutList" },
            { key: "radar",     label: "Радар",      icon: "Radar" },
            { key: "analytics", label: "Аналитика",  icon: "BarChart2" },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
              <Icon name={t.icon} size={14} />
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH TAB */}
      {tab === "search" && (
        <ProspectSearch token={token} projects={projects} onAdd={addFromSearch} />
      )}

      {/* RADAR TAB */}
      {tab === "radar" && (
        <TechRadar token={token} />
      )}

      {/* CRM TAB */}
      {tab === "crm" && (
        <div className="space-y-4">
          {/* Projects bar */}
          <div className="glass neon-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 uppercase tracking-wider">Проекты</span>
              <button onClick={() => setShowProjectForm(!showProjectForm)}
                className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                <Icon name="Plus" size={12} /> Новый проект
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterProject("")}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${!filterProject ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/40 hover:text-white"}`}>
                Все ({totalProspects})
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setFilterProject(String(p.id))}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${filterProject === String(p.id) ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/40 hover:text-white"}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.name}
                  <span className="text-white/30">({p.prospect_count})</span>
                </button>
              ))}
            </div>
            {showProjectForm && (
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <input value={newProject.name} onChange={e => setNewProject(f => ({ ...f, name: e.target.value }))}
                  placeholder="Название проекта"
                  className="flex-1 glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
                <input value={newProject.description} onChange={e => setNewProject(f => ({ ...f, description: e.target.value }))}
                  placeholder="Описание"
                  className="flex-1 glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
                <input type="color" value={newProject.color} onChange={e => setNewProject(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer" />
                <button onClick={createProject} disabled={addingProject || !newProject.name.trim()}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm transition-all">
                  Создать
                </button>
              </div>
            )}
          </div>

          {/* Filters + add */}
          <div className="flex flex-wrap gap-3 items-center">
            <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
              placeholder="Поиск по названию, отрасли..."
              className="flex-1 min-w-48 glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white bg-transparent focus:outline-none">
              <option value="">Все статусы</option>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white bg-transparent focus:outline-none">
              <option value="">Все приоритеты</option>
              {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button onClick={() => { setEditProspect({ status: "new", priority: "medium", source: "manual", project_id: filterProject ? Number(filterProject) : null }); setIsNewEdit(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all">
              <Icon name="Plus" size={14} /> Добавить
            </button>
          </div>

          {/* Kanban-статистика */}
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "" : s.key)}
                className={`glass border rounded-xl p-2.5 text-center transition-all ${filterStatus === s.key ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 hover:border-white/20"}`}>
                <div className="text-lg font-bold text-white">{statusStats[s.key] || 0}</div>
                <div className={`text-xs mt-0.5 ${s.color}`}>{s.label}</div>
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-10 text-white/30 flex items-center justify-center gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" /> Загружаю...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14">
              <Icon name="Users" size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Нет компаний. Найдите клиентов через «Поиск»</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => {
                const st = statusInfo(p.status);
                const pr = priorityInfo(p.priority);
                return (
                  <div key={p.id} onClick={() => selectProspect(p)}
                    className="glass border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-violet-500/30 cursor-pointer transition-all group">
                    {/* Score */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${p.ai_score !== null ? scoreBg(p.ai_score) + ' text-white' : 'glass border border-white/10 text-white/20'}`}>
                      {p.ai_score !== null ? p.ai_score : "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{p.company_name}</span>
                        {p.inn && <span className="text-xs text-white/30 font-mono">ИНН {p.inn}</span>}
                        {p.project_name && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${p.project_color}22`, color: p.project_color || '#fff' }}>
                            {p.project_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-white/40">
                        {p.industry && <span>{p.industry}</span>}
                        {p.region && <span><Icon name="MapPin" size={10} className="inline mr-0.5" />{p.region}</span>}
                        {p.email && <span>{p.email}</span>}
                        {p.phone && <span>{p.phone}</span>}
                        <span className="text-white/20">{p.source}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
                      <span className={`text-xs ${pr.color}`}>{pr.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Всего компаний", val: totalProspects, icon: "Users", color: "text-violet-400" },
              { label: "Клиенты (Won)", val: wonCount, icon: "Trophy", color: "text-emerald-400" },
              { label: "Новые", val: newCount, icon: "Sparkles", color: "text-blue-400" },
              { label: "Высокий приоритет", val: highPriority, icon: "Flame", color: "text-red-400" },
            ].map((k, i) => (
              <div key={i} className="glass neon-border rounded-2xl p-4">
                <Icon name={k.icon as "Users"} size={20} className={k.color + " mb-2"} />
                <div className="text-2xl font-bold text-white">{k.val}</div>
                <div className="text-xs text-white/40 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Средний AI-score */}
          {avgScore !== null && (
            <div className="glass neon-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/60">Средний ИИ-рейтинг клиентов</span>
                <span className={`text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore}/100</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${scoreBg(avgScore)}`} style={{ width: `${avgScore}%` }} />
              </div>
            </div>
          )}

          {/* По статусам */}
          <div className="glass neon-border rounded-2xl p-5">
            <h3 className="font-oswald font-bold text-white mb-4">Воронка продаж</h3>
            <div className="space-y-2">
              {STATUSES.map(s => {
                const cnt = statusStats[s.key] || 0;
                const pct = totalProspects > 0 ? Math.round((cnt / totalProspects) * 100) : 0;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-right text-white/50 flex-shrink-0">{s.label}</div>
                    <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg bg-violet-600/50 flex items-center pl-2 transition-all"
                        style={{ width: `${Math.max(pct, cnt > 0 ? 5 : 0)}%` }}>
                        {cnt > 0 && <span className="text-xs text-white font-semibold">{cnt}</span>}
                      </div>
                    </div>
                    <div className="w-10 text-xs text-white/30 flex-shrink-0">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* По проектам */}
          {projects.length > 0 && (
            <div className="glass neon-border rounded-2xl p-5">
              <h3 className="font-oswald font-bold text-white mb-4">По проектам</h3>
              <div className="space-y-3">
                {projects.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <div className="flex-1 text-sm text-white/70">{p.name}</div>
                    <div className="text-sm font-bold text-white">{p.prospect_count}</div>
                    <div className="text-xs text-white/30">компаний</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Топ по ИИ-рейтингу */}
          {prospects.filter(p => p.ai_score !== null).length > 0 && (
            <div className="glass neon-border rounded-2xl p-5">
              <h3 className="font-oswald font-bold text-white mb-4">Топ-5 по ИИ-рейтингу</h3>
              <div className="space-y-2">
                {[...prospects]
                  .filter(p => p.ai_score !== null)
                  .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
                  .slice(0, 5)
                  .map((p, i) => (
                    <div key={p.id} onClick={() => { selectProspect(p); setTab("crm"); }}
                      className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-xl p-2 transition-all">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-white/40">
                        {i + 1}
                      </div>
                      <div className="flex-1 text-sm text-white">{p.company_name}</div>
                      <div className={`text-sm font-bold ${scoreColor(p.ai_score)}`}>{p.ai_score}</div>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBg(p.ai_score)}`} style={{ width: `${p.ai_score}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Карточка клиента */}
      {selected && !editProspect && (
        <ProspectCard
          prospect={selected}
          activities={activities}
          onEdit={() => { setEditProspect(selected); setIsNewEdit(false); }}
          onClose={() => { setSelected(null); setGenMsgText(""); }}
          onAnalyze={() => analyze(selected)}
          analyzing={analyzing}
          onMessage={generateMessage}
          generatingMsg={generatingMsg}
          generatedMsg={generatedMsg}
          onAddActivity={addActivity}
        />
      )}

      {/* Форма редактирования */}
      {editProspect && (
        <ProspectEdit
          prospect={editProspect}
          projects={projects}
          onSave={saveProspect}
          onCancel={() => setEditProspect(null)}
          saving={saving}
          isNew={isNewEdit}
        />
      )}
    </div>
  );
}