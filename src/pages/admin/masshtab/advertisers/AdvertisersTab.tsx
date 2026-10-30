import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Overview, SendError, SendResp, advGet, advPost, btnGhost, btnPrimary, downloadCsv, n } from "./api";
import SegmentsPanel from "./SegmentsPanel";
import TemplatesPanel from "./TemplatesPanel";
import SettingsPanel from "./SettingsPanel";
import AdvertisersTable from "./AdvertisersTable";
import NightPanel from "./NightPanel";

interface EnrichResp { processed: number; queue: number; email: number; phone: number; site: number }
type Msg = { ok: boolean; text: string } | null;

const DEFAULT_SEGMENTS = "банки и лизинг, ИТ и SaaS для бизнеса, консалтинг и аудит, юристы, бухгалтерский аутсорсинг, HR и рекрутинг, логистика, коммерческая недвижимость, бизнес-образование, страхование, B2B-маркетинг";

function Portrait({ names }: { names: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="glass border border-white/10 rounded-2xl">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 p-4 text-left">
        <span className="text-white font-semibold flex items-center gap-2"><Icon name="Target" size={15} className="text-cyan-300" />Целевая аудитория рекламодателей</span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/50" />
      </button>
      {open && (
        <div className="px-4 pb-4 grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-white/70">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Кто покупает рекламу</div>
            <div>{names.length ? `${names.length} сегментов: ${names.join(", ")}.` : `11 сегментов: ${DEFAULT_SEGMENTS}.`}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Почему они</div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Их клиенты — собственники, гендиректора и финдиректора МСП</li>
              <li>Это ровно наши читатели: журнал о росте малого и среднего бизнеса</li>
              <li>Длинный цикл сделки B2B — им важны доверие и экспертный контент</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Кто принимает решение</div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Маркетинг-директор</li>
              <li>Коммерческий директор</li>
              <li>Собственник (в небольших компаниях)</li>
            </ul>
            <div className="mt-2"><span className="text-white/40">Типичный бюджет:</span> 9–120 тыс ₽/мес</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Ключевые аргументы</div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Точная аудитория ЛПР без случайного трафика</li>
              <li>Контент с цифрами: выручка, рост, реальные кейсы компаний</li>
              <li>Партнёрский материал с бессрочным размещением</li>
              <li>Охват в Дзене + PDF-номер журнала</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdvertisersTab({ token }: { token: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const runningRef = useRef(false);

  const load = useCallback(async () => {
    const d = await advGet<Overview>(token, "overview");
    if (d.error) { setLoadErr(d.error); return; }
    setLoadErr("");
    setData({
      segments: d.segments || [], templates: d.templates || [], sent_today: n(d.sent_today),
      settings: d.settings || {}, daily_limit: n(d.daily_limit), night: d.night, cron_ready: d.cron_ready,
    });
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { runningRef.current = false; }, []);

  const refresh = useCallback(async () => {
    await load();
    setReloadKey(k => k + 1);
  }, [load]);

  async function build(segment: string) {
    setBusy(`build-${segment}`); setMsg(null);
    const d = await advPost<{ added: number }>(token, "build", { segment, limit: 200 });
    setBusy("");
    setMsg(d.error ? { ok: false, text: d.error } : { ok: true, text: `Добавлено компаний: ${n(d.added)}.` });
    await refresh();
  }

  async function enrich(segment?: string) {
    if (runningRef.current) return;
    runningRef.current = true;
    setEnriching(true); setMsg(null);
    const totals = { processed: 0, email: 0, phone: 0, queue: 0 };
    let error = "";
    const show = () => setEnrichMsg(`Обработано ${totals.processed} · найдено почт ${totals.email} · в очереди ${totals.queue}`);
    setEnrichMsg("Ищу контакты...");
    const worker = async () => {
      while (runningRef.current) {
        const d = await advPost<EnrichResp>(token, "enrich", { segment, size: 8 });
        if (d.error) { error = d.error; break; }
        totals.processed += n(d.processed);
        totals.email += n(d.email);
        totals.phone += n(d.phone);
        totals.queue = n(d.queue);
        show();
        if (n(d.processed) <= 0 || n(d.queue) <= 0) break;
      }
    };
    await Promise.all([worker(), worker()]);
    const stopped = !runningRef.current;
    runningRef.current = false;
    setEnriching(false);
    setEnrichMsg(`${stopped ? "Остановлено" : "Готово"}: обработано ${totals.processed} · найдено почт ${totals.email} · телефонов ${totals.phone} · в очереди ${totals.queue}`);
    if (error) setMsg({ ok: false, text: error });
    await refresh();
  }

  function stopEnrich() {
    runningRef.current = false;
    setEnrichMsg(m => `${m} · останавливаю...`);
  }

  async function send(step: 1 | 2, opts: { segment?: string; count?: number; ids?: number[] }) {
    const key = opts.ids ? "send-ids" : `send-${step}-${opts.segment}`;
    setBusy(key); setMsg(null);
    let remaining = opts.ids ? opts.ids.length : (opts.count || 10);
    let sent = 0, skipped = 0, leftToday = 0;
    const errors: SendError[] = [];
    for (let i = 0; i < 20 && remaining > 0; i++) {
      const body = opts.ids ? { step, ids: opts.ids } : { step, segment: opts.segment, count: remaining };
      const d = await advPost<SendResp>(token, "send", body);
      if (d.error) {
        setBusy("");
        setMsg({ ok: false, text: sent ? `Отправлено: ${sent}. Затем ошибка: ${d.error}` : d.error });
        await refresh();
        return;
      }
      const errs = d.errors || [];
      sent += n(d.sent);
      skipped = n(d.skipped);
      leftToday = n(d.left_today);
      errors.push(...errs);
      remaining -= n(d.sent) + errs.length;
      setMsg({ ok: true, text: `Отправляю... ${sent}` });
      if (!(skipped > 0 && leftToday > 0)) break;
    }
    setBusy("");
    setMsg({
      ok: errors.length === 0,
      text: `Отправлено: ${sent}${errors.length ? `, ошибок: ${errors.length} (${errors[0].company}: ${errors[0].error})` : ""}. Осталось на сегодня: ${leftToday}.`,
    });
    await refresh();
  }

  async function exportCsv() {
    setExporting(true);
    const d = await advGet<{ rows: Record<string, unknown>[] }>(token, "export", {});
    setExporting(false);
    if (d.error) { setMsg({ ok: false, text: d.error }); return; }
    const names = Object.fromEntries((data?.segments || []).map(s => [s.code, s.name]));
    downloadCsv(d.rows || [], names);
  }

  if (!data) {
    return loadErr
      ? <div className="text-sm text-red-300 flex items-center gap-2"><Icon name="AlertTriangle" size={14} />{loadErr}<button onClick={load} className="underline ml-2">Повторить</button></div>
      : <div className="text-white/40 text-sm flex items-center gap-2"><Icon name="Loader2" size={14} className="animate-spin" />Загрузка...</div>;
  }

  const sum = (k: "total" | "with_email" | "with_phone" | "sent" | "replied") => data.segments.reduce((a, s) => a + n(s[k]), 0);
  const limit = data.daily_limit || n(data.settings.ads_daily_limit);
  const counters: [string, number, string][] = [
    ["Всего компаний", sum("total"), "Building2"],
    ["С почтой", sum("with_email"), "Mail"],
    ["С телефоном", sum("with_phone"), "Phone"],
    ["Отправлено писем", sum("sent"), "Send"],
    ["Ответили", sum("replied"), "MessageCircleReply"],
  ];

  return (
    <div className="space-y-4">
      <div className="glass neon-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="text-lg text-white font-semibold">База рекламодателей журнала</div>
            <div className="text-sm text-white/50 mt-1">Компании из реестра МСП ФНС по сегментам целевой аудитории. Почта и телефоны ищутся автоматически: ЕГРЮЛ → официальный сайт.</div>
          </div>
          <a href="/masshtab/mediakit" target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5">
            <Icon name="ExternalLink" size={14} />Открыть медиакит
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {counters.map(([l, v, icon]) => (
            <div key={l} className="rounded-xl bg-white/5 p-3">
              <div className="text-[11px] text-white/40 flex items-center gap-1"><Icon name={icon} size={12} fallback="Circle" />{l}</div>
              <div className="text-xl font-bold text-white mt-0.5">{v.toLocaleString("ru-RU")}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white/60">Отправлено сегодня <span className="text-white font-semibold">{data.sent_today}</span> из лимита <span className="text-white font-semibold">{limit || "—"}</span></div>
          <div className="flex flex-wrap gap-2">
            {enriching ? (
              <button onClick={stopEnrich} className={`${btnGhost} border-red-500/40 text-red-300`}>
                <Icon name="Square" size={14} />Остановить поиск
              </button>
            ) : (
              <button onClick={() => enrich()} disabled={!!busy} className={btnPrimary}>
                <Icon name="SearchCheck" size={14} fallback="Search" />Найти контакты для всех
              </button>
            )}
            <button onClick={exportCsv} disabled={exporting} className={btnGhost}>
              <Icon name={exporting ? "Loader2" : "FileSpreadsheet"} size={14} className={exporting ? "animate-spin" : ""} />Выгрузить в Excel (CSV)
            </button>
            <button onClick={() => setShowSettings(v => !v)} className={btnGhost}>
              <Icon name="Settings" size={14} />Настройки
            </button>
          </div>
        </div>
        {enrichMsg && (
          <div className="text-sm text-white/70 flex items-center gap-2">
            {enriching && <Icon name="Loader2" size={14} className="animate-spin text-cyan-300" />}
            {enrichMsg}
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsPanel token={token} settings={data.settings} dailyLimit={data.daily_limit}
          onClose={() => setShowSettings(false)} onSaved={load} />
      )}

      {msg && (
        <div className={`text-sm rounded-xl p-3 border flex items-start justify-between gap-2 ${msg.ok ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-amber-500/30 text-amber-200 bg-amber-500/10"}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="opacity-60 hover:opacity-100"><Icon name="X" size={14} /></button>
        </div>
      )}

      <NightPanel night={data.night} cronReady={!!data.cron_ready} queue={data.segments.reduce((a, s) => a + n(s.to_enrich), 0)} />

      <Portrait names={data.segments.map(s => s.name)} />

      <SegmentsPanel segments={data.segments} busy={busy} enriching={enriching}
        onBuild={build} onEnrich={s => enrich(s)} onSend={(step, segment, count) => send(step, { segment, count })} />

      <TemplatesPanel token={token} templates={data.templates} defaultTo={data.settings.reply_to || ""}
        onSaved={load} onMessage={(ok, text) => setMsg({ ok, text })} />

      <AdvertisersTable token={token} segments={data.segments} reloadKey={reloadKey} busy={busy}
        onSendIds={ids => send(1, { ids })} />
    </div>
  );
}
