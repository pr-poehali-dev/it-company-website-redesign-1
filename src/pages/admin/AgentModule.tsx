import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AGENT_URL, Report, RadarToCrmResult } from "./AgentTypes";
import AgentReportTab from "./AgentReportTab";
import AgentScoutTab from "./AgentScoutTab";

export default function AgentModule({ token }: { token: string }) {
  // Отчёт по CRM
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  // Авто-разведка
  const [mainTab, setMainTab] = useState<"report" | "scout">("report");
  const [scoutRegion, setScoutRegion] = useState("Москва");
  const [scoutIndustry, setScoutIndustry] = useState("Все отрасли");
  const [scoutEnrich, setScoutEnrich] = useState(true);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutStep, setScoutStep] = useState<"idle" | "radar" | "enrich" | "save" | "done">("idle");
  const [scoutResult, setScoutResult] = useState<RadarToCrmResult | null>(null);
  const [scoutError, setScoutError] = useState("");

  async function runScout() {
    setScoutLoading(true);
    setScoutError("");
    setScoutResult(null);
    try {
      setScoutStep("radar");
      const res = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "radar_to_crm",
          region: scoutRegion,
          industry: scoutIndustry === "Все отрасли" ? "" : scoutIndustry,
          enrich: scoutEnrich,
        }),
      });
      const data: RadarToCrmResult = await res.json();
      if (data.ok) {
        setScoutResult(data);
        setScoutStep("done");
      } else {
        setScoutError(data.error || "Ошибка");
        setScoutStep("idle");
      }
    } catch {
      setScoutError("Ошибка соединения");
      setScoutStep("idle");
    } finally {
      setScoutLoading(false);
    }
  }

  async function generateReport() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "generate_report" }),
      });
      const data = await res.json();
      if (data.ok) {
        setReport(data.report);
      } else {
        setError(data.error || "Ошибка генерации");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + главные вкладки */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-oswald font-bold text-xl text-white flex items-center gap-2">
              <Icon name="BrainCircuit" size={22} className="text-violet-400" />
              AI-агент продаж
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              Анализирует CRM, генерирует стратегию и автоматически собирает лидов
            </p>
          </div>
        </div>

        <div className="flex gap-1 glass border border-white/10 rounded-xl p-1 w-fit">
          {([
            { key: "report", label: "Отчёт по CRM", icon: "BarChart2" },
            { key: "scout", label: "Авто-разведка", icon: "Radar" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === t.key ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mainTab === "scout" && (
        <AgentScoutTab
          token={token}
          scoutRegion={scoutRegion}
          scoutIndustry={scoutIndustry}
          scoutEnrich={scoutEnrich}
          scoutLoading={scoutLoading}
          scoutStep={scoutStep}
          scoutResult={scoutResult}
          scoutError={scoutError}
          onRegionChange={setScoutRegion}
          onIndustryChange={setScoutIndustry}
          onEnrichChange={setScoutEnrich}
          onRun={runScout}
        />
      )}

      {mainTab === "report" && (
        <AgentReportTab
          loading={loading}
          report={report}
          error={error}
          onGenerate={generateReport}
        />
      )}
    </div>
  );
}
