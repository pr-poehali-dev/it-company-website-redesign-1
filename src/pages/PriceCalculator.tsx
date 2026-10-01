import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import CalculatorForm from "@/components/price-calculator/CalculatorForm";
import CalculatorResult from "@/components/price-calculator/CalculatorResult";
import PriceSeoContent from "@/components/price-calculator/PriceSeoContent";
import {
  PAGE_URL,
  tasks,
  sizes,
  integrations,
  supports,
  faqSchema,
} from "@/components/price-calculator/priceData";

export default function PriceCalculator() {
  const [task, setTask] = useState<string>("leads");
  const [size, setSize] = useState<string>("s");
  const [picked, setPicked] = useState<string[]>(["crm"]);
  const [support, setSupport] = useState<string>("none");

  const result = useMemo(() => {
    const t = tasks.find((x) => x.id === task) ?? tasks[0];
    const s = sizes.find((x) => x.id === size) ?? sizes[0];
    const intSum = picked.reduce(
      (sum, id) => sum + (integrations.find((i) => i.id === id)?.price ?? 0),
      0
    );
    const project = Math.round((t.base * s.mult + intSum) / 5000) * 5000;
    const sup = supports.find((x) => x.id === support) ?? supports[0];
    const supportTotal = sup.monthly * sup.months;
    return {
      project,
      supportTotal,
      supportMonthly: sup.monthly,
      supportMonths: sup.months,
      total: project + supportTotal,
      days: t.days,
    };
  }, [task, size, picked, support]);

  function toggleIntegration(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <>
      <Helmet>
        <title>Сколько стоит автоматизация бизнеса — расчёт цены | МАТ-Лабс</title>
        <meta
          name="description"
          content="Рассчитайте стоимость автоматизации бизнес-процессов за минуту. Базовые пакеты от 150 000 ₽, сопровождение от 30 000 ₽ в месяц. Без регистрации и звонков."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ООО МАТ-Лабс" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:title" content="Сколько стоит автоматизация бизнеса — расчёт цены" />
        <meta
          property="og:description"
          content="Рассчитайте стоимость автоматизации за минуту. Пакеты от 150 000 ₽, сопровождение от 30 000 ₽ в месяц."
        />
        <meta property="og:url" content={PAGE_URL} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-12 relative">
          <PageBreadcrumbs
            items={[{ label: "Сколько стоит автоматизация" }]}
            className="mb-8"
          />

          <header className="mb-12">
            <h1 className="font-oswald text-4xl md:text-5xl font-bold mb-5 leading-tight">
              Сколько стоит автоматизация бизнеса
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl">
              Честный расчёт без «цена по запросу». Выберите задачу и параметры —
              увидите вилку стоимости и срок внедрения. Без регистрации, звонков
              и обязательств.
            </p>
          </header>

          <CalculatorForm
            task={task}
            setTask={setTask}
            size={size}
            setSize={setSize}
            picked={picked}
            toggleIntegration={toggleIntegration}
            support={support}
            setSupport={setSupport}
          />

          <CalculatorResult result={result} />

          <PriceSeoContent />
        </div>
      </div>
    </>
  );
}
