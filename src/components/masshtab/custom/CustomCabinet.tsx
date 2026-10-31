import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import MShell, { Kicker, serif } from "../MShell";
import Crumbs from "../Crumbs";
import Builder from "./Builder";
import CustomLogin from "./CustomLogin";
import { type Catalog, type CustomIssue, STATUS_LABEL, customGet, customPost, getToken, rub, setToken } from "./customApi";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-[#e9e2d6] text-[#5b5550]", pending: "bg-amber-100 text-amber-800", paid: "bg-sky-100 text-sky-800",
  building: "bg-sky-100 text-sky-800", ready: "bg-emerald-100 text-emerald-800", failed: "bg-red-100 text-red-800",
};

export default function CustomCabinet() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [issues, setIssues] = useState<CustomIssue[]>([]);
  const [editing, setEditing] = useState<CustomIssue | null | "new">(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const t = getToken();
    setAuthed(!!t);
    if (!t) { setReady(true); return []; }
    const r = await customGet<{ issues: CustomIssue[] }>("list");
    if (r.error) { if (!getToken()) setAuthed(false); setReady(true); return []; }
    setIssues(r.issues);
    setReady(true);
    return r.issues;
  }, []);

  const build = useCallback(async (id: number, quiet = false) => {
    setBusy(id);
    if (!quiet) setMsg("");
    const r = await customPost<{ issue: CustomIssue }>({ action: "build", id });
    setBusy(null);
    if (r.error) { if (!quiet) setMsg(r.error); return false; }
    await load();
    if (r.issue?.status === "ready") setMsg(`Готово: выпуск «${r.issue.title}» собран — ${r.issue.pages} полос.`);
    return r.issue?.status === "ready";
  }, [load]);

  useEffect(() => {
    customGet<Catalog>("catalog").then((c) => { if (!c.error) setCatalog(c); });
    load().then(async (list) => {
      const paid = new URLSearchParams(window.location.search).get("paid");
      if (!paid) return;
      window.history.replaceState(null, "", window.location.pathname);
      const id = Number(paid);
      const it = list.find((x) => x.id === id);
      if (!it || it.status === "ready") return;
      setMsg("Проверяем оплату и собираем ваш выпуск…");
      for (let i = 0; i < 6; i++) {
        if (await build(id, true)) return;
        await new Promise((res) => setTimeout(res, 4000));
      }
      setMsg("Оплата ещё обрабатывается банком. Обновите страницу через минуту — PDF появится здесь.");
    });
    const h = () => load();
    window.addEventListener("biz-auth", h);
    return () => window.removeEventListener("biz-auth", h);
  }, [load, build]);

  const pay = async (it: CustomIssue) => {
    setBusy(it.id); setMsg("");
    const r = await customPost<{ payment_url: string }>({ action: "pay", id: it.id, return_url: `${window.location.origin}/masshtab/kabinet` });
    if (r.error || !r.payment_url) { setBusy(null); setMsg(r.error || "Не удалось создать платёж"); return; }
    window.location.href = r.payment_url;
  };

  const remove = async (it: CustomIssue) => {
    if (!window.confirm(`Удалить черновик «${it.title}»?`)) return;
    await customPost({ action: "delete", id: it.id });
    load();
  };

  const logout = () => { setToken(""); setIssues([]); setAuthed(false); setEditing(null); };

  return (
    <MShell active="/masshtab/kabinet">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-16">
        <Crumbs items={[{ label: "Свой журнал", to: "/masshtab/svoy-zhurnal" }, { label: "Личный кабинет" }]} />
        <div className="flex flex-wrap items-end justify-between gap-4 mt-6">
          <div className="max-w-2xl">
            <Kicker>Персональный выпуск · {catalog ? rub(catalog.price) : "990 ₽"}</Kicker>
            <h1 className={`${serif} font-bold text-4xl md:text-5xl mt-2 leading-[1.05]`}>Соберите свой «Масштаб»</h1>
            <p className="text-lg text-[#5b5550] mt-3">Выберите обучающие материалы учисьпро.рф, статьи и полосы вышедших номеров, рейтинг и портрет рынка по своему региону и отрасли, индикаторы — и получите журнал в PDF со своей обложкой.</p>
          </div>
          {authed && (
            <div className="flex gap-2">
              {!editing && <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold px-5 py-3 rounded hover:bg-[#b93522]"><Icon name="Plus" size={18} />Новый выпуск</button>}
              <button type="button" onClick={logout} title="Выйти" className="border-2 border-[#14110f] rounded px-3 hover:bg-[#14110f] hover:text-white"><Icon name="LogOut" size={18} /></button>
            </div>
          )}
        </div>

        {msg && <div className="mt-6 bg-white border-l-4 border-[#d6402b] rounded px-4 py-3 text-sm font-semibold">{msg}</div>}

        <div className="mt-8">
          {!ready ? (
            <div className="h-64 rounded-lg bg-[#e9e2d6] animate-pulse" />
          ) : !authed ? (
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <CustomLogin onDone={load} />
              <Steps />
            </div>
          ) : editing && catalog ? (
            <Builder catalog={catalog} issue={editing === "new" ? null : editing}
              onCancel={() => setEditing(null)}
              onSaved={async (it, doPay) => { setEditing(null); await load(); if (doPay) pay(it); else setMsg("Черновик сохранён."); }} />
          ) : editing ? (
            <div className="h-64 rounded-lg bg-[#e9e2d6] animate-pulse" />
          ) : issues.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {issues.map((it) => (
                <article key={it.id} className="bg-white border border-[#e2d9cb] rounded-lg p-5 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded ${STATUS_COLOR[it.status]}`}>{STATUS_LABEL[it.status]}</span>
                    <span className="text-xs text-[#8a8278]">№ {it.id} · {new Date(it.created_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                  <h3 className={`${serif} font-bold text-xl leading-snug mt-3`}>{it.title}</h3>
                  {(it.cover_name || it.cover_company) && <div className="text-sm text-[#5b5550] mt-1">{[it.cover_name, it.cover_company].filter(Boolean).join(", ")}</div>}
                  <div className="text-sm text-[#8a8278] mt-2">Модулей: {it.modules.length}{it.pages ? ` · ${it.pages} полос` : ""}</div>
                  <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    {it.status === "ready" && it.pdf_url && (
                      <a href={it.pdf_url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-[#14110f] text-white font-bold px-4 py-2.5 rounded hover:bg-[#d6402b]"><Icon name="Download" size={16} />Скачать PDF</a>
                    )}
                    {(it.status === "draft" || it.status === "pending") && (
                      <>
                        <button type="button" onClick={() => pay(it)} disabled={busy === it.id || !it.modules.length}
                          className="inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold px-4 py-2.5 rounded hover:bg-[#b93522] disabled:opacity-50">
                          {busy === it.id ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="CreditCard" size={16} />}Оплатить {rub(it.price)}
                        </button>
                        <button type="button" onClick={() => setEditing(it)} className="border-2 border-[#14110f] font-bold px-3 py-2 rounded text-sm hover:bg-[#14110f] hover:text-white">Изменить</button>
                        <button type="button" onClick={() => remove(it)} aria-label="Удалить" className="px-2 text-[#8a8278] hover:text-[#d6402b]"><Icon name="Trash2" size={16} /></button>
                      </>
                    )}
                    {it.status === "pending" && (
                      <button type="button" onClick={() => build(it.id)} disabled={busy === it.id} className="text-sm font-semibold text-[#d6402b]">Я уже оплатил</button>
                    )}
                    {(it.status === "paid" || it.status === "building" || it.status === "failed") && (
                      <button type="button" onClick={() => build(it.id)} disabled={busy === it.id}
                        className="inline-flex items-center gap-2 bg-[#14110f] text-white font-bold px-4 py-2.5 rounded hover:bg-[#d6402b] disabled:opacity-60">
                        <Icon name={busy === it.id ? "Loader2" : "RefreshCw"} size={16} className={busy === it.id ? "animate-spin" : ""} />{busy === it.id ? "Собираем…" : "Собрать PDF"}
                      </button>
                    )}
                  </div>
                  {it.status === "failed" && <p className="text-xs text-[#d6402b] mt-2">Сборка не удалась — нажмите «Собрать PDF» ещё раз. Повторная сборка бесплатна.</p>}
                </article>
              ))}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-[#cfc3b2] rounded-lg p-10 text-center">
              <Icon name="BookOpen" size={32} className="mx-auto text-[#d6402b]" />
              <div className={`${serif} font-bold text-2xl mt-3`}>У вас пока нет своих выпусков</div>
              <p className="text-[#5b5550] mt-2">Соберите первый — это займёт пару минут.</p>
              <button type="button" onClick={() => setEditing("new")} className="mt-5 inline-flex items-center gap-2 bg-[#d6402b] text-white font-bold px-5 py-3 rounded hover:bg-[#b93522]"><Icon name="Plus" size={18} />Собрать журнал</button>
            </div>
          )}
        </div>

        <p className="text-xs text-[#8a8278] mt-10 max-w-3xl">
          Персональный выпуск — разовая услуга для личного использования. Материалы охраняются авторским правом, перепечатка и распространение — только с письменного согласия издателя.
          Чек об оплате приходит на почту. Вопросы — <Link to="/masshtab/reklama" className="underline">через форму на сайте</Link>.
        </p>
      </div>
    </MShell>
  );
}

function Steps() {
  const s: [string, string][] = [
    ["Войдите по почте", "Без пароля — код придёт на email."],
    ["Отметьте модули", "Обучение учисьпро.рф, статьи и номера журнала, рейтинг и портрет рынка, индикаторы, рабочие страницы."],
    ["Подпишите обложку", "Название выпуска, ваше имя и компания."],
    ["Оплатите и скачайте", "PDF собирается за несколько секунд после оплаты и остаётся в кабинете."],
  ];
  return (
    <ol className="space-y-4">
      {s.map(([t, d], i) => (
        <li key={t} className="flex gap-4">
          <span className={`${serif} font-bold text-3xl text-[#d6402b] w-8 shrink-0`}>{i + 1}</span>
          <span><span className="block font-bold text-lg">{t}</span><span className="block text-[#5b5550] text-sm mt-0.5">{d}</span></span>
        </li>
      ))}
    </ol>
  );
}
