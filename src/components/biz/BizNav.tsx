import { Link, useLocation } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";

const ITEMS = [
  { to: "/analytics", label: "Обзор", icon: "LayoutDashboard" },
  { to: "/analytics/market", label: "Рынки", icon: "PieChart" },
  { to: "/analytics/databases", label: "Базы компаний", icon: "Database" },
  { to: "/analytics/company", label: "Компании и проверка", icon: "ShieldCheck" },
  { to: "/analytics/rating", label: "Рейтинги", icon: "Trophy" },
  { to: "/analytics/bi", label: "Облачный BI", icon: "LayoutDashboard" },
  { to: "/analytics/pipes", label: "Конвейер данных", icon: "Workflow" },
  { to: "/analytics/services", label: "Под ключ", icon: "Handshake" },
  { to: "/radar", label: "Радар господдержки", icon: "Radar" },
  { to: "/analytics/prices", label: "Тарифы", icon: "Tag" },
];

export default function BizNav() {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-wrap gap-1.5 mb-8">
      {ITEMS.map(i => {
        const active = i.to === "/analytics" ? pathname === "/analytics" : pathname.startsWith(i.to);
        return (
          <Link key={i.to} to={i.to}
            className={`flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 rounded-xl text-[13px] md:text-sm transition-colors ${active ? "bg-violet-600 text-white" : "bg-white/5 text-white/65 hover:text-white hover:bg-white/10"}`}>
            <Icon name={i.icon} size={14} />{i.label}
          </Link>
        );
      })}
    </nav>
  );
}