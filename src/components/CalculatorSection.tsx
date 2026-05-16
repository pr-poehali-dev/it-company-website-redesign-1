import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";

interface StepOption {
  label: string;
  icon: string;
  desc?: string;
  base?: number;
  multiplier?: number;
  price?: number;
}

interface Step {
  id: string;
  question: string;
  multi?: boolean;
  options: StepOption[];
}

const steps: Step[] = [
  {
    id: "type",
    question: "Что вам нужно?",
    options: [
      { label: "AI-автоматизация", icon: "Bot", base: 30000, desc: "Обработка заявок, CRM, AI-агент" },
      { label: "Сайт или лендинг", icon: "Globe", base: 50000, desc: "Конверсионный сайт с интеграциями" },
      { label: "ИИ и ML-решение", icon: "Brain", base: 80000, desc: "Чат-боты, предиктивная аналитика" },
      { label: "Аналитика данных", icon: "BarChart3", base: 90000, desc: "Дашборды, BI, ETL-пайплайны" },
      { label: "Кибербезопасность", icon: "Shield", base: 60000, desc: "Аудит, пентест, 152-ФЗ" },
      { label: "Комплексный проект", icon: "Layers", base: 150000, desc: "Несколько направлений под ключ" },
    ],
  },
  {
    id: "scale",
    question: "Масштаб задачи?",
    options: [
      { label: "Базовый", icon: "Zap", multiplier: 1, desc: "MVP, быстрый старт, основные функции" },
      { label: "Стандартный", icon: "TrendingUp", multiplier: 2.2, desc: "Полноценное решение с интеграциями" },
      { label: "Расширенный", icon: "Rocket", multiplier: 4.5, desc: "Комплексный проект с аналитикой" },
    ],
  },
  {
    id: "integrations",
    question: "Какие интеграции нужны?",
    multi: true,
    options: [
      { label: "CRM система", icon: "Database", price: 15000 },
      { label: "Telegram / WhatsApp", icon: "MessageCircle", price: 10000 },
      { label: "1С / ERP", icon: "Server", price: 25000 },
      { label: "Email-рассылки", icon: "Mail", price: 8000 },
      { label: "Яндекс.Метрика / Аналитика", icon: "LineChart", price: 7000 },
      { label: "Не нужны", icon: "X", price: 0 },
    ],
  },
  {
    id: "support",
    question: "Нужна поддержка после запуска?",
    options: [
      { label: "Не нужна", icon: "X", price: 0, desc: "Сдача проекта и до свидания" },
      { label: "1 месяц", icon: "Clock", price: 15000, desc: "Исправление ошибок и мелкие доработки" },
      { label: "3 месяца", icon: "CalendarDays", price: 35000, desc: "Поддержка, обновления, консультации" },
      { label: "6 месяцев", icon: "Star", price: 60000, desc: "Выделенная команда на полгода" },
    ],
  },
];

export default function CalculatorSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [done, setDone] = useState(false);

  const current = steps[step];

  function selectSingle(idx: number) {
    setAnswers(prev => ({ ...prev, [current.id]: idx }));
    if (step < steps.length - 1) {
      setTimeout(() => setStep(s => s + 1), 280);
    } else {
      setTimeout(() => setDone(true), 280);
    }
  }

  function toggleMulti(idx: number) {
    const prev = (answers[current.id] as number[]) || [];
    const noneIdx = current.options.findIndex(o => o.label === "Не нужны");
    if (idx === noneIdx) {
      setAnswers(a => ({ ...a, [current.id]: [noneIdx] }));
      return;
    }
    const withoutNone = prev.filter(i => i !== noneIdx);
    const next = withoutNone.includes(idx)
      ? withoutNone.filter(i => i !== idx)
      : [...withoutNone, idx];
    setAnswers(a => ({ ...a, [current.id]: next }));
  }

  function confirmMulti() {
    if (step < steps.length - 1) setStep(s => s + 1);
    else setDone(true);
  }

  function calcPrice() {
    const typeIdx = (answers["type"] as number) ?? 0;
    const scaleIdx = (answers["scale"] as number) ?? 0;
    const intIdxs = (answers["integrations"] as number[]) || [];
    const supportIdx = (answers["support"] as number) ?? 0;

    const base = steps[0].options[typeIdx]?.base ?? 30000;
    const mult = steps[1].options[scaleIdx]?.multiplier ?? 1;
    const intPrice = intIdxs.reduce((sum, i) => {
      return sum + (steps[2].options[i]?.price ?? 0);
    }, 0);
    const supportPrice = steps[3].options[supportIdx]?.price ?? 0;

    const total = Math.round((base * mult + intPrice + supportPrice) / 1000) * 1000;
    return total;
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setDone(false);
  }

  const progress = (step / steps.length) * 100;
  const multiSelected = (answers[current.id] as number[]) || [];

  if (done) {
    const price = calcPrice();
    const typeIdx = (answers["type"] as number) ?? 0;
    const typeName = steps[0].options[typeIdx]?.label ?? "";

    return (
      <section id="calculator" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
        <div className="max-w-3xl mx-auto px-6 relative">
          <AnimatedSection className="text-center">
            <div className="glass neon-border rounded-3xl p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                  <Icon name="Calculator" size={28} className="text-white" />
                </div>
                <div className="inline-block glass px-3 py-1 rounded-full text-xs text-violet-300 border border-violet-500/30 mb-4">
                  {typeName}
                </div>
                <p className="text-white/50 mb-2">Ориентировочная стоимость проекта</p>
                <div className="font-oswald text-5xl md:text-6xl font-bold gradient-text mb-2">
                  от {price.toLocaleString("ru-RU")} ₽
                </div>
                <p className="text-white/30 text-sm mb-8">
                  Точная цена — после бесплатного разбора задачи
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => { ymGoal("calculator_result", { price, type: typeName }); scrollTo("#contacts"); }}
                    className="btn-gradient px-8 py-4 rounded-2xl text-base font-semibold text-white glow-purple flex items-center gap-2 justify-center"
                  >
                    Получить точный расчёт
                    <Icon name="ArrowRight" size={18} />
                  </button>
                  <button
                    onClick={reset}
                    className="glass px-8 py-4 rounded-2xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/10 flex items-center gap-2 justify-center"
                  >
                    <Icon name="RotateCcw" size={16} />
                    Пересчитать
                  </button>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    );
  }

  return (
    <section id="calculator" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
      <div className="max-w-4xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-12">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
            Калькулятор стоимости
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Узнайте стоимость{" "}
            <span className="gradient-text">вашего проекта</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Ответьте на 4 вопроса — получите ориентировочную цену за 1 минуту
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <div className="glass neon-border rounded-3xl p-8 md:p-10">
            {/* Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/30">Шаг {step + 1} из {steps.length}</span>
              <span className="text-xs text-white/30">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <h3 className="font-oswald text-2xl md:text-3xl font-bold text-white mb-6">
              {current.question}
            </h3>

            {!current.multi && (
              <div className={`grid gap-3 ${current.options.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                {current.options.map((opt, i) => {
                  const selected = answers[current.id] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => selectSingle(i)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left group
                        ${selected
                          ? "bg-violet-600/20 border-violet-500/60 text-white"
                          : "bg-white/3 border-white/10 text-white/70 hover:bg-white/8 hover:border-white/20 hover:text-white"
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all
                        ${selected ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-white/10 group-hover:bg-white/15"}`}>
                        <Icon name={opt.icon} size={18} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm leading-tight">{opt.label}</div>
                        {opt.desc && (
                          <div className="text-xs text-white/40 mt-0.5 leading-tight">{opt.desc}</div>
                        )}
                        {opt.price !== undefined && opt.price > 0 && (
                          <div className="text-xs text-violet-400 mt-0.5">+{opt.price.toLocaleString("ru-RU")} ₽</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {current.multi && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {current.options.map((opt, i) => {
                    const selected = multiSelected.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleMulti(i)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left group
                          ${selected
                            ? "bg-violet-600/20 border-violet-500/60 text-white"
                            : "bg-white/3 border-white/10 text-white/70 hover:bg-white/8 hover:border-white/20 hover:text-white"
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all
                          ${selected ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-white/10 group-hover:bg-white/15"}`}>
                          <Icon name={opt.icon} size={18} className="text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm">{opt.label}</div>
                          {opt.price !== undefined && opt.price > 0 && (
                            <div className="text-xs text-violet-400 mt-0.5">+{opt.price.toLocaleString("ru-RU")} ₽</div>
                          )}
                        </div>
                        {selected && (
                          <Icon name="Check" size={16} className="text-violet-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={confirmMulti}
                  disabled={multiSelected.length === 0}
                  className="btn-gradient w-full py-4 rounded-2xl text-base font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Далее
                  <Icon name="ArrowRight" size={18} />
                </button>
              </>
            )}

            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="mt-4 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mx-auto"
              >
                <Icon name="ChevronLeft" size={14} />
                Назад
              </button>
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
