import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";

// Вход в админку хранится в localStorage — страница рендерится только в браузере.
export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Автоматизация рутины в бизнесе с помощью AI | ***" }] }),
  pendingComponent: AdminFallback,
  component: Admin,
});

function AdminFallback() {
  return (
    <div className="min-h-screen bg-[#080812] flex items-center justify-center text-white/40 text-sm">
      Панель администратора загружается…
    </div>
  );
}
