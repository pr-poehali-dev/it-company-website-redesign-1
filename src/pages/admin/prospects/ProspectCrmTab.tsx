import Icon from "@/components/ui/icon";
import { Project, Prospect, STATUSES, PRIORITIES, statusInfo, priorityInfo, scoreBg } from "./types";
import ExcelImport from "./ExcelImport";

interface Props {
  projects: Project[];
  prospects: Prospect[];
  statusStats: Record<string, number>;
  totalProspects: number;
  loading: boolean;
  filterProject: string;
  filterStatus: string;
  filterPriority: string;
  filterSearch: string;
  showProjectForm: boolean;
  newProject: { name: string; description: string; color: string };
  addingProject: boolean;
  token: string;
  onFilterProject: (v: string) => void;
  onFilterStatus: (v: string) => void;
  onFilterPriority: (v: string) => void;
  onFilterSearch: (v: string) => void;
  onToggleProjectForm: () => void;
  onNewProjectChange: (f: { name: string; description: string; color: string }) => void;
  onCreateProject: () => void;
  onSelectProspect: (p: Prospect) => void;
  onAddNew: () => void;
  onImportDone: () => void;
}

export default function ProspectCrmTab({
  projects, prospects, statusStats, totalProspects, loading,
  filterProject, filterStatus, filterPriority, filterSearch,
  showProjectForm, newProject, addingProject,
  token,
  onFilterProject, onFilterStatus, onFilterPriority, onFilterSearch,
  onToggleProjectForm, onNewProjectChange, onCreateProject,
  onSelectProspect, onAddNew, onImportDone,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Projects bar */}
      <div className="glass neon-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 uppercase tracking-wider">Проекты</span>
          <button onClick={onToggleProjectForm}
            className="text-xs text-violet-400 hover:underline flex items-center gap-1">
            <Icon name="Plus" size={12} /> Новый проект
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onFilterProject("")}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${!filterProject ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/40 hover:text-white"}`}>
            Все ({totalProspects})
          </button>
          {projects.map(p => (
            <button key={p.id} onClick={() => onFilterProject(String(p.id))}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${filterProject === String(p.id) ? "border-violet-500/50 bg-violet-500/10 text-white" : "glass border-white/10 text-white/40 hover:text-white"}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name}
              <span className="text-white/30">({p.prospect_count})</span>
            </button>
          ))}
        </div>
        {showProjectForm && (
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <input value={newProject.name} onChange={e => onNewProjectChange({ ...newProject, name: e.target.value })}
              placeholder="Название проекта"
              className="flex-1 glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
            <input value={newProject.description} onChange={e => onNewProjectChange({ ...newProject, description: e.target.value })}
              placeholder="Описание"
              className="flex-1 glass border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
            <input type="color" value={newProject.color} onChange={e => onNewProjectChange({ ...newProject, color: e.target.value })}
              className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer" />
            <button onClick={onCreateProject} disabled={addingProject || !newProject.name.trim()}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm transition-all">
              Создать
            </button>
          </div>
        )}
      </div>

      {/* Filters + add */}
      <div className="flex flex-wrap gap-3 items-center">
        <input value={filterSearch} onChange={e => onFilterSearch(e.target.value)}
          placeholder="Поиск по названию, отрасли..."
          className="flex-1 min-w-48 glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
        <select value={filterStatus} onChange={e => onFilterStatus(e.target.value)}
          className="glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white bg-transparent focus:outline-none">
          <option value="">Все статусы</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => onFilterPriority(e.target.value)}
          className="glass border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white bg-transparent focus:outline-none">
          <option value="">Все приоритеты</option>
          {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <ExcelImport token={token} projects={projects} onDone={onImportDone} />
        <button onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all">
          <Icon name="Plus" size={14} /> Добавить
        </button>
      </div>

      {/* Kanban-статистика */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => onFilterStatus(filterStatus === s.key ? "" : s.key)}
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
      ) : prospects.length === 0 ? (
        <div className="text-center py-14">
          <Icon name="Users" size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Нет компаний. Найдите клиентов через «Поиск»</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prospects.map(p => {
            const st = statusInfo(p.status);
            const pr = priorityInfo(p.priority);
            return (
              <div key={p.id} onClick={() => onSelectProspect(p)}
                className="glass border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-violet-500/30 cursor-pointer transition-all group">
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
  );
}