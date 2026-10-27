import { useState } from "react";
import Icon from "@/components/ui/icon";
import { GROUPS, KIND, KINDS, type Field } from "./kinds";
import { api, type CleanOpts, type Kind, type Plan, type Schedule, type Source, type TestResult, SCHEDULE_LABEL, num } from "./pipesApi";

const TZS: [string, string][] = [["MSK", "Москва (UTC+3)"], ["SAMT", "Самара (UTC+4)"], ["YEKT", "Екатеринбург (UTC+5)"], ["OMST", "Омск (UTC+6)"], ["KRAT", "Красноярск (UTC+7)"], ["IRKT", "Иркутск (UTC+8)"], ["VLAT", "Владивосток (UTC+10)"], ["UTC", "UTC"]];
const TYPE_LABEL = { number: ["число", "text-cyan-300"], date: ["дата", "text-amber-300"], text: ["текст", "text-violet-300"] } as const;

interface Props { initial?: Source; plan: Plan; onClose: () => void; onSaved: (s: Source, runNow: boolean) => void; onUpgrade: () => void }

export default function SourceWizard({ initial, plan, onClose, onSaved, onUpgrade }: Props) {
  const [kind, setKind] = useState<Kind | null>(initial?.kind || null);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [name, setName] = useState(initial?.name || "");
  const [cfg, setCfg] = useState<Record<string, string>>(initial?.config_public || {});
  const [clean, setClean] = useState<CleanOpts>({ trim: true, drop_empty: true, dedupe: true, numbers: true, dates: true, tz: "MSK", rename: {}, drop_columns: [], ...(initial?.clean || {}) });
  const [schedule, setSchedule] = useState<Schedule>(initial?.schedule || "daily");
  const [notify, setNotify] = useState(initial?.notify_email ?? true);
  const [test, setTest] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const info = kind ? KIND[kind] : null;

  const pick = (k: Kind) => {
    setKind(k);
    const defs: Record<string, string> = {};
    KIND[k].fields.forEach(f => { if (f.def) defs[f.key] = f.def; });
    setCfg(defs); setName(KIND[k].title); setTest(null); setStep(1);
  };

  const missing = info?.fields.filter(f => f.required && !(cfg[f.key] || "").trim()).map(f => f.label) || [];

  const runTest = async (opts = clean) => {
    if (!kind) return;
    setBusy(true); setErr("");
    const r = await api<TestResult>("test", { id: initial?.id, kind, config: cfg, clean: opts });
    setBusy(false);
    setTest(r.error && r.ok === undefined ? { ok: false, error: r.error } : r);
    if (r.ok) setStep(2);
  };

  const save = async (runNow: boolean) => {
    setBusy(true); setErr("");
    const r = await api<{ source: Source }>("save", { id: initial?.id, kind, name, config: cfg, clean, schedule, notify_email: notify });
    setBusy(false);
    if (r.upgrade) { setErr(r.error || ""); return; }
    if (r.error || !r.source) return setErr(r.error || "Не удалось сохранить");
    onSaved(r.source, runNow);
  };

  const setOpt = (patch: Partial<CleanOpts>) => { const n = { ...clean, ...patch }; setClean(n); return n; };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-[#0d0d18] border border-white/10 rounded-3xl my-auto">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          {info && <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center`}><Icon name={info.icon} size={18} /></div>}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{initial ? `Настройки: ${initial.name}` : info ? `Подключение: ${info.title}` : "Новый источник"}</div>
            <div className="flex gap-1.5 mt-1.5">
              {["Источник", "Доступ", "Очистка", "Расписание"].map((l, i) => (
                <div key={l} className="flex items-center gap-1.5 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${i <= step ? "bg-cyan-300" : "bg-white/20"}`} />
                  <span className={i === step ? "text-white" : "text-white/40"}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Закрыть"><Icon name="X" size={20} /></button>
        </div>

        <div className="p-6">
          {step === 0 && (
            <div className="space-y-6">
              {GROUPS.map(g => (
                <div key={g}>
                  <div className="text-xs uppercase tracking-wider text-white/40 mb-2.5">{g}</div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {KINDS.filter(k => k.group === g).map(k => (
                      <button key={k.kind} onClick={() => pick(k.kind)} className="text-left bg-white/[0.03] border border-white/10 hover:border-violet-400/60 hover:bg-white/[0.06] rounded-2xl p-4 flex gap-3 transition-colors">
                        <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}><Icon name={k.icon} size={20} /></div>
                        <div><div className="font-semibold text-white">{k.title}</div><div className="text-xs text-white/50 mt-0.5 leading-snug">{k.desc}</div></div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 1 && info && (
            <div className="grid md:grid-cols-[1fr_280px] gap-6">
              <div className="space-y-3.5">
                <Input label="Название в кабинете" value={name} onChange={setName} placeholder="Например: Продажи из amoCRM" />
                {info.fields.map(f => <FieldInput key={f.key} f={f} value={cfg[f.key] || ""} onChange={v => setCfg(c => ({ ...c, [f.key]: v }))} />)}
                {test && !test.ok && (
                  <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3.5 text-sm text-rose-100 flex gap-2.5"><Icon name="XCircle" size={18} className="text-rose-300 shrink-0 mt-0.5" />{test.error}</div>
                )}
              </div>
              <aside className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 self-start">
                <div className="text-sm font-semibold text-white mb-2.5 flex items-center gap-1.5"><Icon name="Info" size={15} className="text-cyan-300" />Как получить доступ</div>
                <ol className="space-y-2.5">{info.help.map((h, i) => <li key={h} className="flex gap-2 text-xs text-white/65 leading-relaxed"><span className="text-cyan-300 font-semibold">{i + 1}.</span>{h}</li>)}</ol>
                <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-white/45 flex gap-1.5"><Icon name="Lock" size={12} className="shrink-0 mt-0.5" />Пароли и токены хранятся в зашифрованном виде и не показываются даже вам.</div>
              </aside>
            </div>
          )}

          {step === 2 && test?.ok && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat icon="CheckCircle2" color="text-emerald-300" v="Подключено" l={test.note || ""} />
                <Stat icon="Eraser" color="text-amber-300" v={num(test.stats?.dupes)} l="дублей удалено в пробе" />
                <Stat icon="Filter" color="text-violet-300" v={num(test.stats?.empty_rows)} l="пустых строк убрано" />
                <Stat icon="Wand2" color="text-cyan-300" v={num(test.stats?.fixed_values)} l="значений нормализовано" />
              </div>
              <div className="grid md:grid-cols-[260px_1fr] gap-5">
                <div className="space-y-2.5">
                  <div className="text-sm font-semibold text-white">Правила очистки</div>
                  {([["trim", "Убрать лишние пробелы и «—», «н/д»"], ["drop_empty", "Удалить пустые строки"], ["dedupe", "Удалить дубли"], ["numbers", "Числа: «1 200,50 ₽» → 1200.5"], ["dates", "Даты к формату ГГГГ-ММ-ДД"]] as const).map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2.5 text-sm text-white/75 cursor-pointer">
                      <input type="checkbox" checked={!!clean[k]} onChange={e => runTest(setOpt({ [k]: e.target.checked }))} className="accent-violet-500 w-4 h-4" />{l}
                    </label>
                  ))}
                  <Select label="Часовой пояс отчётов" value={clean.tz || "MSK"} options={TZS} onChange={v => runTest(setOpt({ tz: v }))} />
                  {clean.dedupe && (
                    <Select label="Дубль — это одинаковый…" value={clean.dedupe_key || ""} onChange={v => runTest(setOpt({ dedupe_key: v }))}
                      options={[["", "вся строка целиком"], ...(test.columns || []).map(c => [c.source, `«${c.source}»`] as [string, string])]} />
                  )}
                  {busy && <div className="text-xs text-white/50 flex items-center gap-1.5"><Icon name="Loader2" size={13} className="animate-spin" />Пересчитываем пробу…</div>}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white mb-2">Колонки <span className="text-white/40 font-normal">— переименуйте или отключите лишние</span></div>
                  <div className="grid sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {(test.columns || []).map(c => {
                      const off = clean.drop_columns?.includes(c.source);
                      return (
                        <div key={c.source} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${off ? "border-white/5 opacity-50" : "border-white/10 bg-white/[0.03]"}`}>
                          <input type="checkbox" checked={!off} onChange={e => setOpt({ drop_columns: e.target.checked ? (clean.drop_columns || []).filter(x => x !== c.source) : [...(clean.drop_columns || []), c.source] })} className="accent-violet-500" />
                          <input value={clean.rename?.[c.source] ?? c.source} onChange={e => setOpt({ rename: { ...clean.rename, [c.source]: e.target.value } })} className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none" />
                          <span className={`text-[11px] ${TYPE_LABEL[c.type][1]}`}>{TYPE_LABEL[c.type][0]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-sm font-semibold text-white mt-4 mb-2">Проба данных</div>
                  <div className="overflow-auto max-h-56 rounded-xl border border-white/10">
                    <table className="text-xs w-full">
                      <thead className="sticky top-0 bg-[#141424]"><tr>{(test.columns || []).map(c => <th key={c.name} className="text-left font-normal text-white/45 px-2.5 py-2 whitespace-nowrap">{c.name}</th>)}</tr></thead>
                      <tbody>{(test.preview || []).map((r, i) => <tr key={i} className="border-t border-white/5">{(test.columns || []).map(c => <td key={c.name} className="px-2.5 py-1.5 whitespace-nowrap text-white/75 max-w-[220px] truncate">{r[c.name] == null ? <span className="text-white/20">—</span> : String(r[c.name])}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-xl space-y-4">
              <div className="text-sm font-semibold text-white">Как часто обновлять</div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {(Object.keys(SCHEDULE_LABEL) as Schedule[]).map(s => {
                  const locked = !plan.schedules.includes(s);
                  return (
                    <button key={s} onClick={() => (locked ? onUpgrade() : setSchedule(s))}
                      className={`text-left rounded-xl border px-4 py-3 flex items-center justify-between ${schedule === s ? "border-violet-400 bg-violet-500/15" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                      <span className="text-sm text-white">{SCHEDULE_LABEL[s]}</span>
                      {locked ? <span className="text-[11px] text-amber-300 flex items-center gap-1"><Icon name="Lock" size={11} />Бизнес</span> : schedule === s && <Icon name="Check" size={16} className="text-cyan-300" />}
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2.5 text-sm text-white/75 cursor-pointer"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="accent-violet-500 w-4 h-4" />Писать на почту, если загрузка не удалась</label>
              <p className="text-xs text-white/45">При ошибке повторяем попытку автоматически через 30, 60, 90 минут. В отчётах остаются данные последней успешной загрузки.</p>
            </div>
          )}
          {err && <p className="text-rose-300 text-sm mt-4">{err} {err.includes("тариф") && <button onClick={onUpgrade} className="underline text-amber-300">Повысить тариф</button>}</p>}
        </div>

        {step > 0 && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10">
            <button onClick={() => setStep(s => (initial && s === 1 ? s : s - 1))} disabled={!!initial && step === 1} className="text-sm text-white/55 hover:text-white flex items-center gap-1.5 disabled:opacity-0"><Icon name="ArrowLeft" size={15} />Назад</button>
            {step === 1 && (
              <button onClick={() => runTest()} disabled={busy || missing.length > 0} title={missing.length ? `Заполните: ${missing.join(", ")}` : ""}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-semibold text-sm text-white flex items-center gap-2 disabled:opacity-50">
                {busy ? <><Icon name="Loader2" size={16} className="animate-spin" />Подключаемся…</> : <><Icon name="Plug" size={16} />Проверить подключение</>}
              </button>
            )}
            {step === 2 && <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-semibold text-sm text-white flex items-center gap-2">Далее<Icon name="ArrowRight" size={16} /></button>}
            {step === 3 && (
              <div className="flex gap-2">
                <button onClick={() => save(false)} disabled={busy} className="px-4 py-2.5 rounded-xl border border-white/15 text-sm text-white hover:bg-white/5">Сохранить</button>
                <button onClick={() => save(true)} disabled={busy} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 font-semibold text-sm text-white flex items-center gap-2 disabled:opacity-60">
                  {busy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Play" size={16} />}Сохранить и загрузить
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-400";

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <label className="block"><span className="text-xs text-white/55 mb-1 block">{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label className="block"><span className="text-xs text-white/55 mb-1 block">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} [&>option]:bg-[#141424]`}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  );
}

function FieldInput({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  if (f.type === "select") return <Select label={f.label} value={value || f.def || ""} options={f.options || []} onChange={onChange} />;
  return (
    <label className="block">
      <span className="text-xs text-white/55 mb-1 block">{f.label}{f.required && <span className="text-rose-300"> *</span>}</span>
      {f.type === "textarea"
        ? <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={f.placeholder} className={`${inputCls} font-mono text-xs`} />
        : <input type={f.type === "password" ? "password" : "text"} autoComplete="off" value={value} onChange={e => onChange(e.target.value)} placeholder={f.placeholder} className={inputCls} />}
      {f.hint && <span className="text-[11px] text-white/40 mt-1 block">{f.hint}</span>}
    </label>
  );
}

function Stat({ icon, color, v, l }: { icon: string; color: string; v: string; l: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
      <div className={`flex items-center gap-1.5 font-semibold text-white`}><Icon name={icon} size={16} className={color} />{v}</div>
      <div className="text-[11px] text-white/45 mt-1 leading-snug">{l}</div>
    </div>
  );
}
