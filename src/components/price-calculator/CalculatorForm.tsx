import Icon from "@/components/ui/icon";
import { tasks, sizes, integrations, supports, fmt } from "./priceData";

interface CalculatorFormProps {
  task: string;
  setTask: (id: string) => void;
  size: string;
  setSize: (id: string) => void;
  picked: string[];
  toggleIntegration: (id: string) => void;
  support: string;
  setSupport: (id: string) => void;
}

export default function CalculatorForm({
  task,
  setTask,
  size,
  setSize,
  picked,
  toggleIntegration,
  support,
  setSupport,
}: CalculatorFormProps) {
  return (
    <div className="glass neon-border rounded-2xl p-6 md:p-8 mb-8">
      <div className="mb-8">
        <h2 className="font-oswald text-xl font-semibold mb-1">
          1. Какую задачу нужно решить
        </h2>
        <p className="text-white/40 text-sm mb-4">
          Выберите то, что болит сильнее всего
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => setTask(t.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                task === t.id
                  ? "border-violet-500/60 bg-violet-500/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    task === t.id
                      ? "bg-gradient-to-br from-violet-500 to-purple-600"
                      : "bg-white/5"
                  }`}
                >
                  <Icon name={t.icon} size={17} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white mb-1">
                    {t.label}
                  </div>
                  <div className="text-white/45 text-xs leading-relaxed">
                    {t.desc}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-oswald text-xl font-semibold mb-1">
          2. Сколько заявок обрабатываете
        </h2>
        <p className="text-white/40 text-sm mb-4">
          От объёма зависит сложность маршрутизации
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {sizes.map((s) => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                size === s.id
                  ? "border-cyan-500/60 bg-cyan-500/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="font-semibold text-sm text-white mb-1">
                {s.label}
              </div>
              <div className="text-white/45 text-xs">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-oswald text-xl font-semibold mb-1">
          3. Что нужно связать
        </h2>
        <p className="text-white/40 text-sm mb-4">
          Можно выбрать несколько или ничего
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {integrations.map((i) => {
            const on = picked.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() => toggleIntegration(i.id)}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                  on
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <span className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      on
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                        : "bg-white/5"
                    }`}
                  >
                    <Icon name={i.icon} size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-white/85 text-left">
                    {i.label}
                  </span>
                </span>
                <span className="text-xs text-white/40 shrink-0">
                  +{fmt(i.price)} ₽
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-oswald text-xl font-semibold mb-1">
          4. Что после запуска
        </h2>
        <p className="text-white/40 text-sm mb-4">
          Система живёт и меняется вместе с бизнесом
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {supports.map((s) => (
            <button
              key={s.id}
              onClick={() => setSupport(s.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                support === s.id
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="font-semibold text-sm text-white mb-1">
                {s.label}
              </div>
              <div className="text-white/45 text-xs">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
