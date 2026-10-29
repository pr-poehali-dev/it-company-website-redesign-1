import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const URL = "https://functions.poehali.dev/3a15fa3e-e303-48e0-8256-ab37073fa940";
const SECTIONS: [string, string][] = [["pages", "Основные страницы"], ["blog", "Блог"], ["masshtab", "Журнал «Масштаб»"], ["radar", "Радар (18 тыс. компаний)"]];

interface Info { key_ok?: boolean; total?: number; maps?: Record<string, number | string>; error?: string }
interface Result { ok?: boolean; sent?: number; results?: Record<string, number[]>; error?: string }

function token() {
  return localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
}

export default function SeoPingPanel() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [sel, setSel] = useState<string[]>(["pages", "blog", "masshtab", "radar"]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    if (!open || info) return;
    fetch(`${URL}/`, { headers: { "X-Session-Token": token() } }).then(r => r.json()).then(setInfo).catch(() => setInfo({ error: "Нет связи" }));
  }, [open, info]);

  async function send() {
    setBusy(true); setRes(null);
    const r = await fetch(`${URL}/`, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Token": token() }, body: JSON.stringify({ sections: sel }) })
      .then(x => x.json()).catch(() => ({ error: "Нет связи" }));
    setRes(r); setBusy(false);
  }

  const okCode = (codes: number[]) => codes.length > 0 && codes.every(c => c === 200 || c === 202);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 p-4 text-left">
        <Icon name="Globe" size={18} className="text-emerald-300" />
        <div className="flex-1">
          <div className="text-white font-semibold">Поисковики: отправить страницы на переобход</div>
          <div className="text-xs text-white/50">Яндекс и Bing узнают об обновлениях за минуты, а не недели. Нажимайте после публикации изменений.</div>
        </div>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/40" />
      </button>
      {open && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {!info ? <div className="text-sm text-white/50">Проверяем карту сайта…</div> : info.error ? <div className="text-sm text-rose-300">{info.error}</div> : (
            <>
              <div className="text-sm text-white/70 flex flex-wrap gap-x-4 gap-y-1">
                <span>В карте сайта: <b className="text-white">{(info.total || 0).toLocaleString("ru-RU")}</b> адресов</span>
                <span className={info.key_ok ? "text-emerald-300" : "text-amber-300"}>{info.key_ok ? "Ключ подтверждения на месте" : "Ключ не найден — опубликуйте сайт"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map(([k, l]) => (
                  <label key={k} className={`px-3 py-1.5 rounded-xl border text-sm cursor-pointer ${sel.includes(k) ? "border-emerald-500/60 bg-emerald-500/10 text-white" : "border-white/10 text-white/55"}`}>
                    <input type="checkbox" className="hidden" checked={sel.includes(k)} onChange={e => setSel(s => (e.target.checked ? [...s, k] : s.filter(x => x !== k)))} />{l}
                  </label>
                ))}
              </div>
              <button onClick={send} disabled={busy || !sel.length || !info.key_ok} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                <Icon name={busy ? "Loader2" : "Send"} size={15} className={busy ? "animate-spin" : ""} />Отправить в поисковики
              </button>
            </>
          )}
          {res?.error && <div className="text-sm text-rose-300">{res.error}</div>}
          {res?.ok && (
            <div className="text-sm space-y-1">
              <div className="text-white">Отправлено адресов: <b>{res.sent?.toLocaleString("ru-RU")}</b></div>
              {Object.entries(res.results || {}).map(([host, codes]) => (
                <div key={host} className={okCode(codes) ? "text-emerald-300" : "text-amber-300"}>
                  {host.includes("yandex") ? "Яндекс" : "Bing и другие"}: {okCode(codes) ? "принято" : `ответ ${codes.join(", ")}`}
                </div>
              ))}
              <div className="text-xs text-white/45">Google не поддерживает мгновенное оповещение — он сам читает карту сайта, указанную в robots.txt.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
