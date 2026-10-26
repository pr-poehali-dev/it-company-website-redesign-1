import { Dashboard } from "./biEngine";

export const SHARE_URL = "https://functions.poehali.dev/a192c546-5e64-4f51-b296-a02bcb9bba9c";
const OWN = "matlabs_bi_shares";

export interface OwnedShare { id: string; key: string; title: string; at: string }

export function ownedShares(): OwnedShare[] {
  try { return JSON.parse(localStorage.getItem(OWN) || "[]"); } catch { return []; }
}

export function rememberShare(s: OwnedShare) {
  const list = ownedShares().filter(x => x.id !== s.id);
  localStorage.setItem(OWN, JSON.stringify([s, ...list].slice(0, 30)));
}

export function forgetShare(id: string) {
  localStorage.setItem(OWN, JSON.stringify(ownedShares().filter(x => x.id !== id)));
}

export function shareLink(id: string) {
  return `${window.location.origin}/analytics/bi/s/${id}`;
}

async function post<T>(body: Record<string, unknown>): Promise<T & { error?: string; ok?: boolean }> {
  const r = await fetch(`${SHARE_URL}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ error: "Сервер не ответил, попробуйте ещё раз" }));
}

export function publish(dashboard: Dashboard, contact: Record<string, string>) {
  return post<{ id: string; edit_key: string }>({ action: "publish", dashboard, ...contact });
}

export function updateShare(id: string, key: string, dashboard: Dashboard) {
  return post({ action: "update", id, edit_key: key, dashboard });
}

export function removeShare(id: string, key: string) {
  return post({ action: "update", id, edit_key: key, remove: true });
}

export interface ShareMeta { id: string; title: string; data_url: string; updated_at: string; expires_at: string; views: number; author: string; error?: string }

export async function loadShare(id: string): Promise<{ meta: ShareMeta; dash: Dashboard } | { error: string }> {
  const r = await fetch(`${SHARE_URL}/?action=get&id=${encodeURIComponent(id)}`);
  const meta: ShareMeta = await r.json().catch(() => ({ error: "Не удалось загрузить" }));
  if (meta.error) return { error: meta.error };
  const d = await fetch(`${meta.data_url}?v=${encodeURIComponent(meta.updated_at)}`);
  if (!d.ok) return { error: "Данные дашборда недоступны" };
  const dash: Dashboard = JSON.parse(await readMaybeGzip(await d.arrayBuffer()));
  if (!dash?.dataset?.rows) return { error: "Дашборд удалён автором" };
  return { meta, dash };
}

async function readMaybeGzip(buf: ArrayBuffer): Promise<string> {
  const b = new Uint8Array(buf);
  if (b[0] === 0x1f && b[1] === 0x8b && typeof DecompressionStream !== "undefined") {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  return new TextDecoder("utf-8").decode(b);
}
