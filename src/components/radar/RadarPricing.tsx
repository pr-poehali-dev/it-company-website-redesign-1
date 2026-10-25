import Icon from "@/components/ui/icon";

interface Props {
  onSelect: (plan: string) => void;
}

const PLANS = [
  {
    name: "Каталог",
    price: "0 ₽",
    period: "навсегда",
    note: "Без регистрации",
    features: ["Все 18 тыс. компаний и суммы поддержки", "Фильтры по региону, отрасли, сумме", "Сигналы и похожие компании"],
    cta: "Пользоваться",
    accent: false,
  },
  {
    name: "Старт",
    price: "4 900 ₽",
    period: "в месяц",
    note: "Для одного менеджера",
    features: ["Руководитель, телефоны, email, сайт", "Выгрузка в Excel до 500 компаний в месяц", "Подборка новых получателей раз в неделю на почту"],
    cta: "Попробовать 3 дня",
    accent: true,
  },
  {
    name: "Команда",
    price: "14 900 ₽",
    period: "в месяц",
    note: "До 10 сотрудников",
    features: ["Всё из «Старта» без лимита выгрузки", "Подборки под вашу нишу и регион", "Шаблоны первых писем под каждый сегмент"],
    cta: "Обсудить",
    accent: false,
  },
];

export default function RadarPricing({ onSelect }: Props) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {PLANS.map(p => (
        <div key={p.name} className={`rounded-2xl p-6 flex flex-col ${p.accent ? "bg-gradient-to-b from-violet-600/25 to-violet-600/5 border border-violet-500/50" : "bg-white/[0.04] backdrop-blur-sm border border-white/10"}`}>
          {p.accent && <div className="text-[11px] uppercase tracking-wider text-violet-200 mb-2">Чаще выбирают</div>}
          <div className="text-white font-semibold text-lg">{p.name}</div>
          <div className="mt-2 mb-1 flex items-baseline gap-1.5">
            <span className="font-['Oswald',sans-serif] text-4xl font-bold text-white">{p.price}</span>
            <span className="text-white/45 text-sm">{p.period}</span>
          </div>
          <div className="text-xs text-white/45 mb-4">{p.note}</div>
          <ul className="space-y-2 mb-6 flex-1">
            {p.features.map(f => (
              <li key={f} className="flex gap-2 text-sm text-white/75">
                <Icon name="Check" size={16} className="text-emerald-300 shrink-0 mt-0.5" />{f}
              </li>
            ))}
          </ul>
          <button onClick={() => onSelect(p.name)}
            className={`w-full px-5 py-3 rounded-xl font-semibold text-sm ${p.accent ? "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-colors text-white" : "border border-white/15 text-white hover:bg-white/5"}`}>
            {p.cta}
          </button>
        </div>
      ))}
    </div>
  );
}
