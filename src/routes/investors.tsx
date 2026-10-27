import { createFileRoute } from "@tanstack/react-router";
import Investors from "@/pages/Investors";

export const Route = createFileRoute("/investors")({ component: Investors });
