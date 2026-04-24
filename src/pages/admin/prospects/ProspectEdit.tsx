import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prospect, Project, STATUSES, PRIORITIES } from "./types";

interface Props {
  prospect: Partial<Prospect>;
  projects: Project[];
  onSave: (data: Partial<Prospect>) => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}

export default function ProspectEdit({ prospect, projects, onSave, onCancel, saving, isNew }: Props) {
  const [form, setForm] = useState<Partial<Prospect>>({ ...prospect });

  function set(k: keyof Prospect, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-xl h-[calc(100vh-2rem)] glass neon-border rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <h2 className="font-oswald font-bold text-lg text-white">
            {isNew ? "Добавить компанию" : "Редактировать"}
          </h2>
          <button onClick={onCancel} className="glass border border-white/10 p-2 rounded-xl">
            <Icon name="X" size={14} className="text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Основное */}
          <section className="space-y-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">Основная информация</span>
            <Field label="Название компании *" required>
              <input value={form.company_name || ""} onChange={e => set("company_name", e.target.value)}
                className="w-full bg-white border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500/50" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ИНН"><input value={form.inn || ""} onChange={e => set("inn", e.target.value)} className={inputCls} /></Field>
              <Field label="ОГРН"><input value={form.ogrn || ""} onChange={e => set("ogrn", e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Отрасль / ОКВЭД"><input value={form.industry || ""} onChange={e => set("industry", e.target.value)} className={inputCls} /></Field>
            <Field label="Описание">
              <textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3}
                className={inputCls + " resize-none"} />
            </Field>
          </section>

          {/* Контакты */}
          <section className="space-y-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">Контакты</span>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"><input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} className={inputCls} /></Field>
              <Field label="Телефон"><input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Сайт"><input value={form.website || ""} onChange={e => set("website", e.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Регион"><input value={form.region || ""} onChange={e => set("region", e.target.value)} className={inputCls} /></Field>
              <Field label="Адрес"><input value={form.address || ""} onChange={e => set("address", e.target.value)} className={inputCls} /></Field>
            </div>
          </section>

          {/* Компания */}
          <section className="space-y-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">Данные о компании</span>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Численность сотрудников"><input value={form.employee_count || ""} onChange={e => set("employee_count", e.target.value)} className={inputCls} /></Field>
              <Field label="Диапазон выручки"><input value={form.revenue_range || ""} onChange={e => set("revenue_range", e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Год основания">
              <input type="number" value={form.founded_year || ""} onChange={e => set("founded_year", Number(e.target.value) || null)} className={inputCls} />
            </Field>
          </section>

          {/* CRM */}
          <section className="space-y-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">CRM</span>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Статус">
                <select value={form.status || "new"} onChange={e => set("status", e.target.value)}
                  className={inputCls + " bg-transparent"}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Приоритет">
                <select value={form.priority || "medium"} onChange={e => set("priority", e.target.value)}
                  className={inputCls + " bg-transparent"}>
                  {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Прикрепить к проекту">
              <select value={form.project_id || ""} onChange={e => set("project_id", e.target.value ? Number(e.target.value) : null)}
                className={inputCls + " bg-transparent"}>
                <option value="">— без проекта —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Следующее действие">
              <input value={form.next_action || ""} onChange={e => set("next_action", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Дата следующего действия">
              <input type="date" value={form.next_action_date || ""} onChange={e => set("next_action_date", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Заметка">
              <textarea value={form.note || ""} onChange={e => set("note", e.target.value)} rows={3}
                className={inputCls + " resize-none"} />
            </Field>
          </section>

          {/* Источник */}
          <section className="space-y-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">Источник</span>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Источник"><input value={form.source || "manual"} onChange={e => set("source", e.target.value)} className={inputCls} /></Field>
              <Field label="URL источника"><input value={form.source_url || ""} onChange={e => set("source_url", e.target.value)} className={inputCls} /></Field>
            </div>
          </section>
        </div>

        <div className="flex gap-3 p-5 border-t border-white/10 flex-shrink-0">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-white/60 text-sm font-semibold">
            Отмена
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !form.company_name?.trim()}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
            {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
            {isNew ? "Добавить" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-white border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500/50";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/40">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}