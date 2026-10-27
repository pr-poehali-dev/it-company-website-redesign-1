import { createFileRoute } from "@tanstack/react-router";
import AccountPage from "@/pages/analytics/AccountPage";

export const Route = createFileRoute("/analytics/account")({
  ssr: false,
  head: () => ({ meta: [{ title: "Мой кабинет — бизнес-аналитика | МАТ-Лабс" }, { name: "robots", content: "noindex" }] }),
  component: AccountPage,
});
