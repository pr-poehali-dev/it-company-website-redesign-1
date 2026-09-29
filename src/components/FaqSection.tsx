import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass neon-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-white text-sm md:text-base">{question}</span>
        <Icon
          name="ChevronDown"
          size={18}
          className={`text-violet-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 text-white/60 text-sm leading-relaxed border-t border-white/5 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="py-24 relative">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="max-w-4xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
            FAQ
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
            Частые{" "}
            <span className="gradient-text">вопросы</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">Отвечаем на самые популярные вопросы о сотрудничестве</p>
        </AnimatedSection>
        <div className="space-y-3">
          {[
            {
              q: "Сколько стоит автоматизация бизнес-процессов?",
              a: "Пакет «Заявки» — от 150 000 ₽: формы, интеграция с CRM, уведомления, автоответы. Пакет «AI-обработка» — от 250 000 ₽: AI-ассистент, квалификация лидов, автоотчёты. Пакет «Под ключ» — от 500 000 ₽: связка всех систем и дашборд. Точную цену назовём после бесплатного разбора.",
            },
            {
              q: "Сколько времени занимает внедрение?",
              a: "Пакет «Заявки» — 7–10 дней. Пакет «AI-обработка» — 10–14 дней. Комплексный проект под ключ — 3–4 недели. Работаем итеративно: первые рабочие результаты показываем уже на первой неделе.",
            },
            {
              q: "Что входит в абонентское сопровождение?",
              a: "От 30 000 ₽ в месяц: мониторинг всех интеграций, доработки и новые сценарии каждый месяц, приоритетная реакция на сбои, обновление AI-сценариев под новые задачи, ежемесячный отчёт по метрикам и консультации вашей команды.",
            },
            {
              q: "Можно ли доработать существующий сайт?",
              a: "Да. Подключаем автоматизацию без полной переделки: добавляем формы с интеграцией в CRM, AI-чат, уведомления и аналитику. Это дешевле и быстрее, чем разработка с нуля.",
            },
            {
              q: "Что такое бесплатный разбор?",
              a: "Это 30-минутная встреча, где мы изучаем ваши процессы и показываем конкретные точки для автоматизации. Без обязательств: вы получаете рекомендации, даже если не станете нашим клиентом.",
            },
            {
              q: "Работаете ли вы с компаниями из других городов?",
              a: "Да, работаем по всей России удалённо. Встречи проводим онлайн, доступ к системам настраиваем удалённо, документооборот электронный. Головной офис — в Самаре.",
            },
          ].map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}