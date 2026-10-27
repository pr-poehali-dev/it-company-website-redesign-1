import { createFileRoute } from "@tanstack/react-router";
import Consultant from "@/pages/Consultant";

export const Route = createFileRoute("/consultant")({ component: Consultant });
