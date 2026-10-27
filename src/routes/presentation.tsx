import { createFileRoute } from "@tanstack/react-router";
import Presentation from "@/pages/Presentation";

export const Route = createFileRoute("/presentation")({ component: Presentation });
