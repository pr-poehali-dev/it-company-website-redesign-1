import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { ymGoal } from "@/lib/ym";
import { turnkeyProducts, formatRub } from "@/lib/turnkey";

const CONTACT_URL = "https://functions.poehali.dev/0c33a6f9-4b7e-4dc3-8c2e-6db6eadb5f1d";
const DRAFT_KEY = "turnkey-draft";
const PHONE_DISPLAY = "+7 927 748-68-68";
const PHONE_HREF = "tel:+79277486868";
const TG_HREF = "https://t.me/mat_labs";

export type Plan = "launch" | "launch_support";

interface FormState {
  name: string;
  phone: string;
  email: string;
  city: string;
  product: string;
  plan: Plan;
  budget: string;
  contact_way: string;
  message: string;
  consent: boolean;
  website: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  city: "",
  product: "",
  plan: "launch_support",
  budget: "",
  contact_way: "Звонок",
  message: "",
  consent: false,
  website: "",
};

const budgets = ["до 300 000 ₽", "300 000 – 500 000 ₽", "500 000 – 1 000 000 ₽", "более 1 000 000 ₽", "Пока не определился"];
const contactWays = ["Звонок", "WhatsApp", "Telegram", "Email"];

function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (d && !d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  if (!d) return "";
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let out = "+7";
  if (p[0]) out += ` (${p[0]}`;
  if (p[0].length === 3) out += ")";
  if (p[1]) out += ` ${p[1]}`;
  if (p[2]) out += `-${p[2]}`;
  if (p[3]) out += `-${p[3]}`;
  return out;
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Как к вам обращаться?";
  if (f.phone.replace(/\D/g, "").length !== 11) e.phone = "Нужен номер полностью: +7 и 10 цифр";
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Проверьте email";
  if (!f.product) e.product = "Выберите проект";
  if (!f.consent) e.consent = "Нужно согласие на обработку данных";
  return e;
}

async function postWithRetry(payload: object, attempts = 3) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(CONTACT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (res.status >= 400 && res.status < 500) return { ok: false as const, data };
      if (res.ok && data.success) return { ok: true as const, data };
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  throw lastErr;
}

const inputCls = (err?: string) =>
  `w-full bg-white/5 border ${err ? "border-rose-500/70" : "border-white/10 focus:border-violet-500/60"} rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-[15px]`;

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
      <Icon name="CircleAlert" size={12} />
      {text}
    </p>
  );
}

interface Props {
  preset: { product: string; plan: Plan; nonce: number };
}

export default function TurnkeyForm({ preset }: Props) {
  const [form, setForm] = useState<FormState>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...emptyForm, ...JSON.parse(saved), website: "" } : emptyForm;
    } catch {
      return emptyForm;
    }
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const startedAt = useRef(Date.now());
  const started = useRef(false);

  useEffect(() => {
    if (!preset.nonce) return;
    setForm((f) => ({ ...f, product: preset.product, plan: preset.plan }));
    setErrors((e) => ({ ...e, product: undefined }));
  }, [preset]);

  useEffect(() => {
    if (status === "success") return;
    try {
      const { website: _w, ...draft } = form;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage недоступен */
    }
  }, [form, status]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (!started.current) {
      started.current = true;
      ymGoal("turnkey_form_start");
    }
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const selected = turnkeyProducts.find((p) => p.title === form.product);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setServerError("");
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`tk-${first}`)?.focus();
      return;
    }
    if (Date.now() - startedAt.current < 2500) {
      setStatus("success");
      return;
    }

    setStatus("sending");
    const planLabel = form.plan === "launch_support" ? "Запуск + сопровождение" : "Только запуск";
    const priceNote = selected
      ? `${planLabel}: запуск ${formatRub(selected.launchPrice)}${form.plan === "launch_support" ? `, сопровождение ${formatRub(selected.supportPrice)}/мес` : ""}`
      : planLabel;

    try {
      const { ok, data } = await postWithRetry({
        source: "turnkey",
        name: form.name.trim(),
        phone: form.phone,
        email: form.email.trim(),
        city: form.city.trim(),
        product: form.product,
        plan: priceNote,
        budget: form.budget,
        contact_way: form.contact_way,
        message: form.message.trim(),
        website: form.website,
      });
      if (!ok) {
        if (data?.field) setErrors({ [data.field]: data.error } as Errors);
        setServerError(data?.error || "Проверьте поля формы");
        setStatus("error");
        return;
      }
      ymGoal("turnkey_form_submit", { product: form.product, plan: form.plan });
      setRequestId(data.id ?? null);
      setStatus("success");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
    } catch {
      setServerError("Не удалось отправить: похоже, пропал интернет. Данные сохранены — нажмите «Отправить» ещё раз или позвоните нам.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="glass neon-border rounded-3xl p-8 md:p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5">
          <Icon name="Check" size={32} className="text-white" />
        </div>
        <h3 className="font-oswald text-2xl md:text-3xl font-bold text-white mb-3">Заявка принята{requestId ? ` — №${requestId}` : ""}</h3>
        <p className="text-white/60 max-w-md mx-auto mb-6">
          Перезвоним в течение рабочего дня, чтобы договориться о бесплатном разборе. Если хотите быстрее — позвоните сами.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href={PHONE_HREF} className="btn-gradient px-6 py-3 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2">
            <Icon name="Phone" size={16} />
            {PHONE_DISPLAY}
          </a>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setStatus("idle");
              setRequestId(null);
              startedAt.current = Date.now();
            }}
            className="glass border border-white/20 px-6 py-3 rounded-xl text-sm font-semibold text-white/80 hover:text-white"
          >
            Отправить ещё одну
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="glass neon-border rounded-3xl p-6 md:p-10">
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px opacity-0"
      />

      <div className="mb-6">
        <label className="block text-sm text-white/70 mb-2">Какой проект запускаем? *</label>
        <div id="tk-product" tabIndex={-1} className="grid sm:grid-cols-2 gap-3 outline-none">
          {turnkeyProducts.map((p) => {
            const active = form.product === p.title;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => set("product", p.title)}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-xl p-3 text-left border transition-all ${
                  active ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/25"
                }`}
              >
                <img src={p.icon} alt="" className={`w-10 h-10 rounded-lg object-cover bg-gradient-to-br ${p.color} flex-shrink-0`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-white">{p.title}</span>
                  <span className="block text-xs text-white/50 truncate">{p.niche}</span>
                </span>
                <Icon name={active ? "CircleCheck" : "Circle"} size={18} className={active ? "text-violet-400" : "text-white/20"} />
              </button>
            );
          })}
        </div>
        <FieldError text={errors.product} />
      </div>

      <div className="mb-6">
        <label className="block text-sm text-white/70 mb-2">Формат</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {([
            ["launch_support", "Запуск + сопровождение", "Рекомендуем"],
            ["launch", "Только запуск", "Дальше сами"],
          ] as const).map(([val, label, hint]) => {
            const active = form.plan === val;
            return (
              <button
                type="button"
                key={val}
                onClick={() => set("plan", val)}
                aria-pressed={active}
                className={`rounded-xl p-3 text-left border transition-all ${
                  active ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/25"
                }`}
              >
                <span className="block text-sm font-semibold text-white">{label}</span>
                <span className="block text-xs text-white/50">{hint}</span>
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="mt-3 text-sm text-white/70">
            Итого: запуск <b className="text-white">{formatRub(selected.launchPrice)}</b>
            {form.plan === "launch_support" && (
              <>
                {" "}+ сопровождение <b className="text-white">{formatRub(selected.supportPrice)}/мес</b>
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="tk-name" className="block text-sm text-white/70 mb-2">Имя *</label>
          <input id="tk-name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Иван" className={inputCls(errors.name)} />
          <FieldError text={errors.name} />
        </div>
        <div>
          <label htmlFor="tk-phone" className="block text-sm text-white/70 mb-2">Телефон *</label>
          <input
            id="tk-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set("phone", formatPhone(e.target.value))}
            placeholder="+7 (900) 000-00-00"
            className={inputCls(errors.phone)}
          />
          <FieldError text={errors.phone} />
        </div>
        <div>
          <label htmlFor="tk-city" className="block text-sm text-white/70 mb-2">Город запуска</label>
          <input id="tk-city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Самара" className={inputCls()} />
        </div>
        <div>
          <label htmlFor="tk-email" className="block text-sm text-white/70 mb-2">Email</label>
          <input id="tk-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="по желанию" className={inputCls(errors.email)} />
          <FieldError text={errors.email} />
        </div>
        <div>
          <label htmlFor="tk-budget" className="block text-sm text-white/70 mb-2">Бюджет на запуск</label>
          <select id="tk-budget" value={form.budget} onChange={(e) => set("budget", e.target.value)} className={`${inputCls()} appearance-none`}>
            <option value="" className="bg-[#0f0f1f]">Не указан</option>
            {budgets.map((b) => (
              <option key={b} value={b} className="bg-[#0f0f1f]">{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-contact_way" className="block text-sm text-white/70 mb-2">Как удобнее связаться</label>
          <select id="tk-contact_way" value={form.contact_way} onChange={(e) => set("contact_way", e.target.value)} className={`${inputCls()} appearance-none`}>
            {contactWays.map((w) => (
              <option key={w} value={w} className="bg-[#0f0f1f]">{w}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="tk-message" className="block text-sm text-white/70 mb-2">Комментарий</label>
        <textarea
          id="tk-message"
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Ваш опыт, вопросы, когда хотите стартовать"
          className={`${inputCls()} resize-none`}
        />
      </div>

      <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
        <input
          id="tk-consent"
          type="checkbox"
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
          className="mt-1 w-4 h-4 accent-violet-500 flex-shrink-0"
        />
        <span className="text-xs text-white/50 leading-relaxed">
          Согласен на обработку персональных данных для связи по заявке
          <FieldError text={errors.consent} />
        </span>
      </label>

      {serverError && (
        <div role="alert" className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200 flex gap-3">
          <Icon name="TriangleAlert" size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            {serverError}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <a href={PHONE_HREF} className="underline text-white">{PHONE_DISPLAY}</a>
              <a href={TG_HREF} target="_blank" rel="noopener noreferrer" className="underline text-white">Telegram</a>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-gradient w-full py-4 rounded-xl text-base font-semibold text-white glow-purple disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {status === "sending" ? (
          <>
            <Icon name="Loader2" size={18} className="animate-spin" />
            Отправляем…
          </>
        ) : (
          <>
            Получить бесплатный разбор
            <Icon name="ArrowRight" size={18} />
          </>
        )}
      </button>
      <p className="mt-4 text-center text-xs text-white/40">
        Или сразу позвоните: <a href={PHONE_HREF} className="text-white/70 underline">{PHONE_DISPLAY}</a>
      </p>
    </form>
  );
}