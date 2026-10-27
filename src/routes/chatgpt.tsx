import { createFileRoute } from "@tanstack/react-router";
import ChatGPT from "@/pages/ChatGPT";

export const Route = createFileRoute("/chatgpt")({ component: ChatGPT });
