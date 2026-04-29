import { useState, useEffect, useMemo } from "react";
import ProspectSearch from "./prospects/ProspectSearch";
import ProspectCard from "./prospects/ProspectCard";
import ProspectEdit from "./prospects/ProspectEdit";
import TechRadar from "./prospects/TechRadar";
import ProspectModuleHeader from "./prospects/ProspectModuleHeader";
import ProspectCrmTab from "./prospects/ProspectCrmTab";
import ProspectAnalyticsTab from "./prospects/ProspectAnalyticsTab";
import {
  PROSPECTS_URL, Project, Prospect, SearchResult, Activity, AiAnalysis,
} from "./prospects/types";

export default function ProspectModule({ token }: { token: string }) {
  const [tab, setTab] = useState<"search" | "crm" | "analytics" | "radar">("search");

  // Data
  const [projects, setProjects]       = useState<Project[]>([]);
  const [prospects, setProspects]     = useState<Prospect[]>([]);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});
  const [totalProspects, setTotal]    = useState(0);
  const [loading, setLoading]         = useState(false);

  // Filters
  const [filterProject, setFilterProject]   = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSearch, setFilterSearch]     = useState("");

  // Selected / Edit
  const [selected, setSelected]         = useState<Prospect | null>(null);
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [editProspect, setEditProspect] = useState<Partial<Prospect> | null>(null);
  const [isNewEdit, setIsNewEdit]       = useState(false);
  const [saving, setSaving]             = useState(false);

  // AI
  const [analyzing, setAnalyzing]     = useState(false);
  const [generatingMsg, setGenMsg]    = useState(false);
  const [generatedMsg, setGenMsgText] = useState("");

  // Projects
  const [newProject, setNewProject]         = useState({ name: "", description: "", color: "#7c3aed" });
  const [addingProject, setAddingProject]   = useState(false);
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

  async function deleteProspect(id: number) {
    await api("delete", "POST", { id });
    setSelected(null);
    setGenMsgText("");
    await loadProspects();
  }

  async function agentAct(prospectId: number, mode = "auto") {
    const data = await api("agent_act", "POST", { prospect_id: prospectId, mode });
    if (selected?.id === prospectId) await loadActivities(prospectId);
    await loadProspects();
    return data;
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

  const wonCount     = statusStats["won"] || 0;
  const newCount     = statusStats["new"] || 0;
  const highPriority = prospects.filter(p => p.priority === "high").length;
  const avgScore     = prospects.filter(p => p.ai_score !== null).length > 0
    ? Math.round(prospects.filter(p => p.ai_score !== null).reduce((s, p) => s + (p.ai_score || 0), 0) / prospects.filter(p => p.ai_score !== null).length)
    : null;

  return (
    <div className="space-y-6">
      <ProspectModuleHeader tab={tab} onTabChange={setTab} />

      {tab === "search" && (
        <ProspectSearch token={token} projects={projects} onAdd={addFromSearch} />
      )}

      {tab === "radar" && (
        <TechRadar token={token} />
      )}

      {tab === "crm" && (
        <ProspectCrmTab
          projects={projects}
          prospects={filtered}
          statusStats={statusStats}
          totalProspects={totalProspects}
          loading={loading}
          filterProject={filterProject}
          filterStatus={filterStatus}
          filterPriority={filterPriority}
          filterSearch={filterSearch}
          showProjectForm={showProjectForm}
          newProject={newProject}
          addingProject={addingProject}
          token={token}
          onFilterProject={setFilterProject}
          onFilterStatus={setFilterStatus}
          onFilterPriority={setFilterPriority}
          onFilterSearch={setFilterSearch}
          onToggleProjectForm={() => setShowProjectForm(!showProjectForm)}
          onNewProjectChange={setNewProject}
          onCreateProject={createProject}
          onSelectProspect={selectProspect}
          onImportDone={loadProspects}
          onAddNew={() => {
            setEditProspect({ status: "new", priority: "medium", source: "manual", project_id: filterProject ? Number(filterProject) : null });
            setIsNewEdit(true);
          }}
        />
      )}

      {tab === "analytics" && (
        <ProspectAnalyticsTab
          prospects={prospects}
          projects={projects}
          statusStats={statusStats}
          totalProspects={totalProspects}
          wonCount={wonCount}
          newCount={newCount}
          highPriority={highPriority}
          avgScore={avgScore}
          onSelectProspect={selectProspect}
          onSwitchToCrm={() => setTab("crm")}
        />
      )}

      {selected && !editProspect && (
        <ProspectCard
          prospect={selected}
          activities={activities}
          token={token}
          onEdit={() => { setEditProspect(selected); setIsNewEdit(false); }}
          onClose={() => { setSelected(null); setGenMsgText(""); }}
          onDelete={() => deleteProspect(selected.id)}
          onAgentAct={(mode) => agentAct(selected.id, mode)}
          onAnalyze={() => analyze(selected)}
          analyzing={analyzing}
          onMessage={generateMessage}
          generatingMsg={generatingMsg}
          generatedMsg={generatedMsg}
          onAddActivity={addActivity}
          onEmailFound={async (email) => {
            if (selected?.id) {
              await api("patch_email", "POST", { prospect_id: selected.id, email });
              await loadActivities(selected.id);
              await loadProspects();
            }
          }}
        />
      )}

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