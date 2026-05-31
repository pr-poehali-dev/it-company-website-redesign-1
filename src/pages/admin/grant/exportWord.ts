import { ChatMessage } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatBlock(text: string): string {
  return esc(text)
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));
      if (isList) {
        const items = lines
          .map((l) => `<li>${l.replace(/^([-*•]|\d+[.)])\s+/, "")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${para.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

export function exportApplicationToWord(messages: ChatMessage[], grantName?: string) {
  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  if (assistantMsgs.length === 0) return;

  const title = grantName ? `Заявка на грант: ${grantName}` : "Грантовая заявка";
  const dateStr = new Date().toLocaleDateString("ru-RU");

  const bodyContent = assistantMsgs.map((m) => formatBlock(m.content)).join("\n");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.5; color: #000; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
  .meta { text-align: center; color: #555; font-size: 12px; margin-bottom: 24px; }
  p { margin: 0 0 10px 0; text-align: justify; }
  ul { margin: 0 0 10px 24px; }
  li { margin-bottom: 4px; }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">МАТ-Лабс · ${dateStr}</div>
  ${bodyContent}
</body>
</html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (grantName || "Грантовая_заявка").replace(/[^\wа-яА-ЯёЁ-]+/g, "_").slice(0, 60);
  a.download = `${safeName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
