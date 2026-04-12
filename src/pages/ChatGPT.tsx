import { ChatGPTPlaygroundPage } from "@/components/extensions/chatgpt-polza/ChatGPTPlaygroundPage";

const API_URL = "https://functions.poehali.dev/a7020aa9-1dee-44e5-adb5-83e5cebf9635";

export default function ChatGPT() {
  return <ChatGPTPlaygroundPage apiUrl={API_URL} defaultModel="openai/gpt-4o-mini" />;
}
