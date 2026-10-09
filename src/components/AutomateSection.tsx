import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";

const pains = [
  { icon: "Inbox", problem: "Заявки теряются", solution: "AI-менеджер принимает и фиксирует каждое обращение" },
  { icon: "MessageSquare", problem: "Менеджеры отвечают вручную", solution: "AI-оператор отвечает клиентам за минуты, 24/7" },
  { icon: "Database", problem: "CRM заполняется руками", solution: "Карточки и сделки создаются автоматически" },
  { icon: "PhoneCall", problem: "Много звонков без контроля", solution: "AI-анализ звонков и оценка работы менеджеров" },
  { icon: "FileText", problem: "Документы готовят вручную", solution: "Договоры, КП и акты собираются сами" },
  { icon: "Sheet", problem: "Всё живёт в Excel", solution: "Автоматическая аналитика и дашборд руководителя" },
  { icon: "Clock", problem: "Клиенты долго ждут", solution: "AI-первая линия поддержки" },
  { icon: "Search", problem: "Сотрудники ищут информацию", solution: "Корпоративный AI-помощник по базе знаний" },
];

const ladder = [
  {
    step: "01",
    name: "AI-аудит",
    price: "0 ₽",
    term: "30–45 минут",
    gradient: "from-emerald-500 to-teal-600",
    items: ["3 точки потери денег", "3 процесса для автоматизации", "Оценка экономии", "Предварительная стоимость"],
  },
  {
    step: "02",
    name: "AI-пилот",
    price: "30–70 тыс. ₽",
    term: "3–7 дней",
    gradient: "from-cyan-500 to-blue-600",
    items: ["Один процесс под ключ", "AI-менеджер или Telegram-бот", "Квалификация заявок", "Замер результата"],
  },
  {
    step: "03",
    name: "Внедрение",
    price: "100–500 тыс. ₽",
    term: "7–21 день",
    gradient: "from-violet-600 to-purple-600",
    items: ["CRM + AI + сайт + мессенджеры", "Интеграции с 1С и сервисами", "Обучение команды", "Отчёт «было → стало»"],
    featured: true,
  },
  {
    step: "04",
    name: "AI-партнёр",
    price: "от 15 тыс. ₽/мес",
    term: "постоянно",
    gradient: "from-pink-500 to-rose-600",
    items: ["Внешний AI-отдел компании", "Мониторинг и доработки", "Новые сценарии каждый месяц", "Аналитика по метрикам"],
  },
];

export default function AutomateSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  return (
    <section id="what-we-do" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-14">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
            Что автоматизируем
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Что мы можем автоматизировать{" "}
            <span className="gradient-text">в вашем бизнесе</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Узнайте свою проблему — у неё уже есть готовое решение
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {pains.map((p, i) => (
            <AnimatedSection key={i}>
              <div className="glass neon-border rounded-2xl p-5 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                  <Icon name={p.icon} size={18} className="text-red-400" />
                </div>
                <div className="text-white/80 text-sm font-semibold mb-3">{p.problem}</div>
                <div className="flex items-start gap-2 mt-auto pt-3 border-t border-white/5">
                  <Icon name="ArrowRight" size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-white/55 leading-snug">{p.solution}</span>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mb-12">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-cyan-300 border border-cyan-500/30 mb-6">
            Как начать работу
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Четыре шага —{" "}
            <span className="gradient-text-3">без большого риска</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Начните с бесплатного аудита и небольшого пилота. Масштабируйте то, что уже дало результат
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ladder.map((l, i) => (
            <AnimatedSection key={i}>
              <div className={`glass rounded-2xl p-6 h-full flex flex-col relative ${l.featured ? "border-2 border-violet-500/60" : "neon-border"}`}>
                {l.featured && (
                  <span className="absolute -top-3 left-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full">
                    Основной продукт
                  </span>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${l.gradient} flex items-center justify-center font-oswald font-bold text-white`}>
                    {l.step}
                  </div>
                  <span className="text-xs text-white/40">{l.term}</span>
                </div>
                <h3 className="font-oswald text-2xl font-bold text-white mb-1">{l.name}</h3>
                <div className="font-oswald text-xl gradient-text font-bold mb-5">{l.price}</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {l.items.map((t, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-white/60">
                      <Icon name="Check" size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { ymGoal("cta_click", { source: `ladder_${l.step}` }); scrollTo("#contacts"); }}
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-white ${i === 0 || l.featured ? "btn-gradient" : "glass border border-white/15 hover:bg-white/10"}`}
                >
                  {i === 0 ? "Записаться на аудит" : "Обсудить"}
                </button>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
