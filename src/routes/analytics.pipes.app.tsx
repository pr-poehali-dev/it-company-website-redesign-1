import { createFileRoute } from "@tanstack/react-router";
import PipesApp from "@/pages/analytics/PipesApp";

export const Route = createFileRoute("/analytics/pipes/app")({
  ssr: false,
  head: () => ({ meta: [{ title: "Кабинет — Конвейер данных | МАТ-Лабс" }, { name: "robots", content: "noindex" }] }),
  component: PipesApp,
});
