import { createFileRoute } from "@tanstack/react-router";
import CustomCabinet from "@/components/masshtab/custom/CustomCabinet";

export const Route = createFileRoute("/masshtab/kabinet")({
  ssr: false,
  head: () => ({ meta: [{ title: "Личный кабинет — свой выпуск «Масштаба»" }, { name: "robots", content: "noindex" }] }),
  component: CustomCabinet,
});
