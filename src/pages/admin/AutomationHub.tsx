import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Tab } from "./automation/automation-ui";
import CronStatusBar from "./automation/CronStatusBar";
import TabEmailer from "./automation/TabEmailer";
import TabFollowup from "./automation/TabFollowup";
import TabRadar from "./automation/TabRadar";
import TabAnalyze from "./automation/TabAnalyze";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "emailer", label: "Авто-рассылка", icon: "Mail" },
  { key: "followup", label: "Follow-up", icon: "RefreshCw" },
  { key: "radar", label: "Радар", icon: "Radar" },
  { key: "analyze", label: "Анализ сайтов", icon: "Globe" },
];

export default function AutomationHub({ token: _token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("emailer");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-oswald font-bold text-xl text-white flex items-center gap-2">
            <Icon name="Zap" size={22} className="text-violet-400" />
            Центр автоматизации
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Управление автоматическими функциями агента продаж
          </p>
        </div>
      </div>

      <CronStatusBar />

      <div className="flex gap-1 glass border border-white/10 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-violet-600 text-white"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon name={t.icon as "Mail"} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "emailer" && <TabEmailer />}
      {activeTab === "followup" && <TabFollowup />}
      {activeTab === "radar" && <TabRadar />}
      {activeTab === "analyze" && <TabAnalyze />}
    </div>
  );
}
