import { UPLOAD_URL } from "../types";

export function uploadImage(file: File, token: string): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = String(e.target?.result || "").split(",")[1];
      try {
        const r = await fetch(`${UPLOAD_URL}/`, {
          method: "POST", headers: { "Content-Type": "application/json", "X-Session-Token": token },
          body: JSON.stringify({ image: base64, content_type: file.type }),
        });
        const d = await r.json();
        resolve(d.url || null);
      } catch { resolve(null); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400";
export const lbl = "block text-xs text-white/50 mb-1.5";
