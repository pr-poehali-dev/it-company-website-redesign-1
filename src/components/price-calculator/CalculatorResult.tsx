import { useNavigate } from "react-router-dom";
import { ymGoal } from "@/lib/ym";
import { fmt, type CalcResult } from "./priceData";

interface CalculatorResultProps {
  result: CalcResult;
}

export default function CalculatorResult({ result }: CalculatorResultProps) {
  const navigate = useNavigate();

  return (
    <div className="glass neon-border rounded-2xl p-6 md:p-8 mb-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-cyan-600/10" />
      <div className="relative">
        <div className="text-white/40 text-sm mb-2">
          Ориентировочная стоимость проекта
        </div>
        <div className="font-oswald text-4xl md:text-5xl font-bold gradient-text mb-1">
          от {fmt(result.project)} ₽
        </div>
        <div className="text-white/50 text-sm mb-6">
          Срок внедрения — {result.days}
        </div>

        {result.supportMonths > 0 && (
          <div className="border-t border-white/10 pt-5 mb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-white/60 text-sm">
                Сопровождение {result.supportMonths} мес. по{" "}
                {fmt(result.supportMonthly)} ₽
              </span>
              <span className="font-oswald text-xl font-bold text-white">
                {fmt(result.supportTotal)} ₽
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mt-3 pt-3 border-t border-white/10">
              <span className="text-white/80 font-semibold">
                Итого за первый период
              </span>
              <span className="font-oswald text-2xl font-bold gradient-text">
                {fmt(result.total)} ₽
              </span>
            </div>
          </div>
        )}

        <p className="text-white/40 text-xs leading-relaxed mb-6">
          Это ориентир, а не коммерческое предложение. Точная стоимость
          зависит от состояния ваших систем и требований к решению —
          называем её после бесплатного разбора задачи.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              ymGoal("cta_click", { source: "price_calculator" });
              navigate("/consultant");
            }}
            className="btn-gradient px-7 py-3.5 rounded-xl font-semibold text-sm text-white glow-purple"
          >
            Получить точный расчёт
          </button>
          <button
            onClick={() => navigate("/avtomatizaciya-biznesa")}
            className="glass border border-white/20 px-7 py-3.5 rounded-xl font-semibold text-sm text-white hover:border-white/40 transition-all"
          >
            Автоматизация в вашем городе
          </button>
        </div>
      </div>
    </div>
  );
}
