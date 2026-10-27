import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@/lib/router-compat";
import { useLoaderData } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card, Kpi, SourceNote } from "@/components/biz/BizUi";
import BizOrderModal from "@/components/biz/BizOrderModal";
import UnlockModal from "@/components/biz/UnlockModal";
import WatchButton from "@/components/biz/WatchButton";
import { userToken } from "@/components/biz/bizApi";
import CompanySearch from "@/components/biz/CompanySearch";
import { CompanyReport as Report, bizGet, fmtYear, money, num, prettyName } from "@/components/biz/bizApi";

const STATUS: Record<string, [string, string]> = {
  ACTIVE: ["Действующая", "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"],
  LIQUIDATING: ["Ликвидируется", "text-amber-300 bg-amber-500/10 border-amber-500/30"],
  LIQUIDATED: ["Ликвидирована", "text-rose-300 bg-rose-500/10 border-rose-500/30"],
  BANKRUPT: ["Банкрот", "text-rose-300 bg-rose-500/10 border-rose-500/30"],
  REORGANIZING: ["Реорганизация", "text-amber-300 bg-amber-500/10 border-amber-500/30"],
};
const RISK: Record<string, [string, string, string]> = {
  low: ["Низкий риск", "text-emerald-300", "#34d399"],
  mid: ["Средний риск", "text-amber-300", "#fbbf24"],
  high: ["Высокий риск", "text-rose-300", "#fb7185"],
};
const FACTOR_ICON = { high: ["XCircle", "text-rose-300"], mid: ["AlertTriangle", "text-amber-300"], good: ["CheckCircle2", "text-emerald-300"] } as const;

const COMPANY_INCLUDES = [
  "Полные данные ЕГРЮЛ: руководитель, учредители, адрес, филиалы",
  "Финансы и рентабельность в сравнении с отраслью и регионом",
  "Список прямых конкурентов с ИНН и выручкой",
  "Контакты компании (сайт, телефон, почта — если найдены)",
];

function Gauge({ score, level }: { score: number; level: string }) {
  const [, , color] = RISK[level];
  const a = Math.PI * (1 - score / 100);
  const x = 60 + 48 * Math.cos(a);
  const y = 60 - 48 * Math.sin(a);
  return (
    <svg viewBox="0 0 120 70" className="w-40">
      <path d="M12 60 A48 48 0 0 1 108 60" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" strokeLinecap="round" />
      <path d={`M12 60 A48 48 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <text x="60" y="58" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">{score}</text>
    </svg>
  );
}

export default function CompanyReport() {
  const { inn = "" } = useParams();
  const navigate = useNavigate();
  const loaded = (useLoaderData({ strict: false }) as { report?: Report | null } | undefined)?.report ?? null;
  const [d, setD] = useState<Report | null>(loaded && loaded.inn === inn ? loaded : null);
  const [error, setError] = useState("");
  const [unlock, setUnlock] = useState(false);
  const [order, setOrder] = useState(false);
  const refetch = () => bizGet<Report>({ action: "company", inn }).then(r => { if (!r.error) setD(r); }).catch(() => {});

  useEffect(() => {
    if (!inn) return;
    setError("");
    if (loaded && loaded.inn === inn) {
      setD(loaded);
      if (!loaded.full_access && (localStorage.getItem("admin_token") || userToken())) refetch();
      return;
    }
    setD(null);
    bizGet<Report>({ action: "company", inn }).then(r => (r.error ? setError(r.error) : setD(r))).catch(() => setError("Не удалось загрузить"));
  }, [inn, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = d ? prettyName(d.short_name || d.name) : "";
  const st = d ? STATUS[d.status] || ["Статус неизвестен", "text-white/60 bg-white/5 border-white/10"] : null;
  const f = d?.finance;
  const p = d?.peers;

  if (!inn) {
    return (
      <BizShell title="Проверка контрагента и отчёт о компании по ИНН | МАТ-Лабс"
        description="Проверка компании по ИНН: статус ЕГРЮЛ, выручка и прибыль за 2025 год, налоговые долги, индекс риска, место среди конкурентов. Бесплатно, без регистрации."
        path="/analytics/company" crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Компании и проверка" }]}>
        <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold mb-3">Отчёт о компании и проверка контрагента</h1>
        <p className="text-white/60 mb-6 max-w-3xl">Введите название или ИНН. Бесплатно и без регистрации — статус, финансы 2025 года, налоговые долги, индекс риска и место среди конкурентов. Войдите по email — откроем полный отчёт и пришлём письмо, если у компании что-то изменится.</p>
        <div className="max-w-2xl mb-10"><CompanySearch big onPick={i => navigate(`/analytics/company/${i}`)} /></div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["ShieldCheck", "Индекс риска 0–100", "Ликвидация, долги перед налоговой, убытки, «пустые» компании с большой выручкой и без сотрудников"],
            ["BarChart3", "Финансы и сравнение", "Выручка, прибыль, рентабельность и выручка на сотрудника против медианы отрасли в регионе"],
            ["Users", "Конкуренты рядом", "Компании той же отрасли и региона с похожей выручкой — для сравнения и поиска партнёров"],
          ].map(([i, h, t]) => (
            <Card key={h}><Icon name={i} size={22} className="text-violet-300 mb-2" /><div className="font-semibold text-white mb-1">{h}</div><p className="text-sm text-white/55">{t}</p></Card>
          ))}
        </div>
      </BizShell>
    );
  }

  return (
    <BizShell title={d ? `${name} (ИНН ${d.inn}) — выручка ${money(f?.revenue)}, проверка контрагента | МАТ-Лабс` : "Отчёт о компании | МАТ-Лабс"}
      description={d ? `${name}, ИНН ${d.inn}, ${d.region_name}. Выручка за 2025 год ${money(f?.revenue)}, сотрудников ${d.staff ?? "—"}. Индекс риска ${d.risk.score}/100, налоговая недоимка ${money(d.tax_debt)}.` : ""}
      path={`/analytics/company/${inn}`} noindex={!!error}
      crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Компании", href: "/analytics/company" }, { label: name || inn }]}>
      <div className="max-w-xl mb-6"><CompanySearch onPick={i => navigate(`/analytics/company/${i}`)} placeholder="Проверить другую компанию" /></div>

      {error && <Card><p className="text-white/60 text-center py-8">{error}</p></Card>}
      {!d && !error && <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />}

      {d && f && st && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-5 min-w-0">
            <header>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border ${st[1]}`}>{st[0]}</span>
                {d.msp && <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">{d.msp}</span>}
                {d.tax_mode && <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">{d.tax_mode === "ОСН" ? "общая система налогообложения" : d.tax_mode}</span>}
              </div>
              <h1 className="font-['Oswald',sans-serif] text-3xl md:text-4xl font-bold leading-tight">{name}</h1>
              <p className="text-white/60 mt-1">{d.okved_name || d.okved2_name}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-white/50">
                <span>ИНН {d.inn}</span>{d.ogrn && <span>ОГРН {d.ogrn}</span>}{d.kpp && <span>КПП {d.kpp}</span>}
                <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{d.region_name}</span>
              </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi value={f.revenue != null ? money(f.revenue) : "—"} label="выручка 2025" />
              <Kpi value={f.profit != null ? money(f.profit) : "—"} label="доходы минус расходы" accent={f.profit != null && f.profit < 0 ? "from-rose-300 to-orange-300" : "from-emerald-300 to-cyan-300"} />
              <Kpi value={f.margin != null ? `${f.margin}%` : "—"} label="рентабельность" sub={p?.med_margin != null ? `медиана отрасли ${(p.med_margin * 100).toFixed(1)}%` : undefined} />
              <Kpi value={d.staff ?? "—"} label="сотрудников" sub={f.rev_per_staff ? `${money(f.rev_per_staff)} на человека` : undefined} />
            </div>

            {p && (
              <Card title="Место на рынке" icon="Trophy">
                <div className="grid sm:grid-cols-3 gap-4 text-center">
                  <div><div className="font-['Oswald',sans-serif] text-3xl font-bold text-white">{p.rank} <span className="text-base text-white/40">из {num(p.n)}</span></div><div className="text-xs text-white/50 mt-1">по выручке в отрасли в регионе</div></div>
                  <div><div className="font-['Oswald',sans-serif] text-3xl font-bold text-white">{num(p.rank_ru)} <span className="text-base text-white/40">из {num(p.n_ru)}</span></div><div className="text-xs text-white/50 mt-1">в отрасли по России</div></div>
                  <div><div className="font-['Oswald',sans-serif] text-3xl font-bold text-white">{f.revenue && p.med ? `×${(f.revenue / p.med).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}` : "—"}</div><div className="text-xs text-white/50 mt-1">к медиане отрасли в регионе ({money(p.med)})</div></div>
                </div>
                <div className="mt-4 text-center">
                  <Link to={`/analytics/market/${d.okved2}/${d.region}`} className="text-sm text-violet-300 hover:text-white inline-flex items-center gap-1">Отчёт о рынке «{d.okved2_name}» в регионе<Icon name="ArrowRight" size={13} /></Link>
                </div>
              </Card>
            )}

            <Card title="Проверка контрагента" icon="ShieldCheck">
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                <div className="text-center shrink-0">
                  <Gauge score={d.risk.score} level={d.risk.level} />
                  <div className={`font-semibold ${RISK[d.risk.level][1]}`}>{RISK[d.risk.level][0]}</div>
                  <div className="text-[11px] text-white/40">индекс 0–100</div>
                </div>
                <div className="flex-1 space-y-2.5 w-full">
                  {d.risk.factors.length ? d.risk.factors.map(x => (
                    <div key={x.text} className="flex gap-2.5 text-sm text-white/80">
                      <Icon name={FACTOR_ICON[x.level][0]} size={17} className={`${FACTOR_ICON[x.level][1]} shrink-0 mt-0.5`} />{x.text}
                    </div>
                  )) : <p className="text-sm text-white/50">Существенных факторов риска в открытых данных не найдено.</p>}
                  <div className="pt-2 grid grid-cols-2 gap-3 text-sm border-t border-white/5">
                    <div><span className="text-white/45">Налоговая недоимка: </span><span className={d.tax_debt ? "text-rose-300" : "text-emerald-300"}>{d.tax_debt ? money(d.tax_debt) : "нет"}</span></div>
                    <div><span className="text-white/45">Зарегистрирована: </span><span className="text-white">{fmtYear(d.registered)}</span></div>
                  </div>
                </div>
              </div>
            </Card>

            {d.grant && (
              <Card title="Господдержка 2024–2026" icon="Landmark">
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div><div className="text-white/45 text-xs">Всего получено</div><div className="text-emerald-300 text-lg font-semibold">{money(d.grant.total_amount)}</div></div>
                  <div><div className="text-white/45 text-xs">Последняя выплата</div><div className="text-white">{money(d.grant.last_amount)} · {d.grant.last_date?.slice(0, 10).split("-").reverse().join(".")}</div></div>
                  <div><div className="text-white/45 text-xs">Выплат</div><div className="text-white">{d.grant.payments}</div></div>
                </div>
                <p className="text-xs text-white/45 mt-3">{d.grant.source_full}</p>
              </Card>
            )}

            <Card title="Похожие компании" icon="Users" right={<span className="text-xs text-white/40">та же отрасль и регион, близкая выручка</span>}>
              <div className="grid sm:grid-cols-2 gap-2">
                {d.competitors.map((c, i) => c.locked ? (
                  <button key={i} onClick={() => setUnlock(true)} className="text-left bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center gap-2 text-white/40 hover:border-violet-500/40">
                    <Icon name="Lock" size={13} /><span className="blur-[4px] select-none">ООО «Конкурент»</span><span className="ml-auto text-xs text-white/60">{money(c.revenue)}</span>
                  </button>
                ) : (
                  <Link key={c.inn} to={`/analytics/company/${c.inn}`} className="bg-white/[0.03] border border-white/10 hover:border-violet-500/40 rounded-xl p-3">
                    <div className="text-sm text-white truncate">{prettyName(c.name)}</div>
                    <div className="text-xs text-white/45 mt-0.5">{money(c.revenue)}{c.staff ? ` · ${c.staff} чел.` : ""}</div>
                  </Link>
                ))}
              </div>
            </Card>
            <SourceNote>Финансы — открытые данные ФНС за 2025 год. Статус, руководитель и адрес — ЕГРЮЛ на момент запроса. Индекс риска — оценка МАТ-Лабс по открытым данным и не является юридическим заключением.</SourceNote>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 self-start">
            <Card title="Реквизиты" icon="FileBadge">
              <div className="space-y-2.5 text-sm">
                <div><div className="text-white/45 text-xs">{d.head_post || "Руководитель"}</div><div className="text-white">{d.head || "—"}</div></div>
                <div><div className="text-white/45 text-xs">Адрес</div><div className="text-white">{d.address || "—"}</div></div>
                <div><div className="text-white/45 text-xs">Основной ОКВЭД</div><div className="text-white">{d.okved} {d.okved_name}</div></div>
                {d.capital != null && <div><div className="text-white/45 text-xs">Уставный капитал</div><div className="text-white">{money(d.capital)}</div></div>}
                {d.msp_year && <div><div className="text-white/45 text-xs">В реестре МСП с</div><div className="text-white">{d.msp_year}</div></div>}
              </div>
            </Card>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <div className="font-semibold text-white mb-1 flex items-center gap-2"><Icon name="Bell" size={16} className="text-cyan-300" />Следить за компанией</div>
              <p className="text-xs text-white/55 mb-3">Пришлём письмо, если сменится статус, руководитель, адрес, появится налоговый долг или вырастет риск.</p>
              <WatchButton inn={d.inn} />
            </div>
            {!d.full_access && (
              <div className="bg-gradient-to-b from-violet-600/25 to-violet-600/5 border border-violet-500/40 rounded-2xl p-5">
                <div className="text-[11px] uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1"><Icon name="Gift" size={12} />Бесплатно</div>
                <div className="font-semibold text-white mb-3">Полный отчёт о компании</div>
                <ul className="space-y-1.5 mb-4">{COMPANY_INCLUDES.map(t => <li key={t} className="flex gap-2 text-xs text-white/70"><Icon name="Check" size={14} className="text-emerald-300 shrink-0" />{t}</li>)}</ul>
                <button onClick={() => setUnlock(true)} className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 px-4 py-3 rounded-xl text-sm font-semibold text-white">Открыть бесплатно</button>
                <p className="text-[11px] text-white/40 mt-2 text-center">Вход по email, без пароля и карты</p>
              </div>
            )}
            {d.full_access && d.unlocked && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100 flex gap-2"><Icon name="CheckCircle2" size={17} className="text-emerald-300 shrink-0 mt-0.5" />Полный отчёт открыт. <Link to="/analytics/account" className="underline">Мои отчёты</Link></div>
            )}
            <button onClick={() => setOrder(true)} className="w-full text-left bg-white/[0.03] border border-white/10 hover:border-violet-500/40 rounded-2xl p-4">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><Icon name="FileText" size={15} className="text-violet-300" />PDF для службы безопасности</div>
              <div className="text-xs text-white/50 mt-1">Заключение с подписью аналитика, учредители, суды и связи — по запросу</div>
            </button>
          </aside>
        </div>
      )}

      {unlock && d && <UnlockModal kind="company" unlockKey={d.inn} title={`Отчёт о компании: ${name}`} onUnlocked={refetch} onClose={() => setUnlock(false)} />}
      {order && d && (
        <BizOrderModal reportType="custom" reportKey={d.inn} title={`Заключение для службы безопасности: ${name}, ИНН ${d.inn}`}
          includes={["Индекс риска и разбор каждого фактора", "Учредители, связанные компании, суды и исполнительные производства", "Вывод аналитика: можно ли работать и на каких условиях", "PDF с подписью — для СБ и бухгалтерии"]}
          onClose={() => setOrder(false)} />
      )}
    </BizShell>
  );
}