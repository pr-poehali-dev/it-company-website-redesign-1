import Icon from "@/components/ui/icon";

type Tab = "search" | "crm" | "analytics" | "radar";

interface Props {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function ProspectModuleHeader({ tab, onTabChange }: Props) {
  return (
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
          { key: "search",    label: "Поиск",    icon: "Search" },
          { key: "crm",       label: "CRM",       icon: "LayoutList" },
          { key: "radar",     label: "Радар",     icon: "Radar" },
          { key: "analytics", label: "Аналитика", icon: "BarChart2" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => onTabChange(t.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
            <Icon name={t.icon} size={14} />
            <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
