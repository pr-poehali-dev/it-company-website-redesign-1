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
              q: "Сколько стоит разработка сайта или приложения?",
              a: "Стоимость зависит от сложности проекта. Разработка ПО — от 150 000 ₽, облачные решения — от 80 000 ₽, ИИ и ML — от 200 000 ₽. Точную стоимость рассчитаем после обсуждения задачи.",
            },
            {
              q: "Как долго длится разработка?",
              a: "Сроки зависят от объёма: лендинг — 2–4 недели, веб-приложение — 2–4 месяца, корпоративная платформа — от 6 месяцев. Работаем итеративно — первые результаты видны уже через 2 недели.",
            },
            {
              q: "Работаете ли вы с иногородними клиентами?",
              a: "Да, мы работаем со всей Россией и международными клиентами удалённо. Офис в Москве, но большинство проектов ведётся онлайн без потери качества.",
            },
            {
              q: "Что такое AI-консультант МАТ-Лабс?",
              a: "AI-консультант — интеллектуальный ассистент, который помогает сформулировать техническое задание. После диалога вы получаете готовое ТЗ, наши менеджеры рассматривают его в течение 2 часов.",
            },
            {
              q: "Какие гарантии вы предоставляете?",
              a: "Работаем по договору с чёткими сроками и этапами сдачи. Поддержка от 3 до 12 месяцев после запуска в зависимости от пакета. 98% клиентов довольны результатом.",
            },
          ].map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
