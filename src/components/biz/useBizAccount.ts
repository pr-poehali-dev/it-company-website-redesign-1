import { useCallback, useEffect, useState } from "react";
import { BizMe, bizGet, userToken } from "./bizApi";

export function useBizAccount() {
  const [authed, setAuthed] = useState(false);
  const [me, setMe] = useState<BizMe | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!userToken()) { setAuthed(false); setMe(null); setReady(true); return null; }
    setAuthed(true);
    const r = await bizGet<BizMe>({ action: "me" }).catch(() => null);
    if (r && !r.error) setMe(r);
    else if (r?.error) { setAuthed(!!userToken()); }
    setReady(true);
    return r && !r.error ? r : null;
  }, []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener("biz-auth", h);
    window.addEventListener("pipes-logout", h);
    return () => { window.removeEventListener("biz-auth", h); window.removeEventListener("pipes-logout", h); };
  }, [reload]);

  return { authed, me, ready, reload };
}

export const emitAuth = () => window.dispatchEvent(new Event("biz-auth"));
