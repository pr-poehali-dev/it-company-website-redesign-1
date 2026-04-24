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
              q: "Сколько времени занимает внедрение?",
              a: "В большинстве случаев базовая автоматизация внедряется за 7–14 дней. Более сложные интеграции и веб-сервисы — от 3 до 6 недель. На первом разборе назовём точные сроки для вашей задачи.",
            },
            {
              q: "Подходит ли это для малого бизнеса?",
              a: "Да. Многие решения можно внедрить даже в небольших компаниях с минимальным бюджетом. AI-автоматизация — это не только для корпораций. Мы работали с командами от 3 человек.",
            },
            {
              q: "Можно ли доработать существующий сайт?",
              a: "Да. Мы можем улучшить текущий сайт и подключить автоматизацию без полной переделки: добавить форму с интеграцией в CRM, подключить AI-чат, настроить уведомления и аналитику.",
            },
            {
              q: "Сколько стоит автоматизация?",
              a: "Стоимость зависит от задачи. Простая интеграция (сайт → CRM → уведомления) — от 30 000 ₽. Полноценный AI-агент для обработки заявок — от 80 000 ₽. Точную цену назовём после разбора вашего процесса.",
            },
            {
              q: "Что такое бесплатный разбор?",
              a: "Это 30-минутная встреча, где мы изучим ваши процессы и покажем конкретные точки для автоматизации. Без обязательств. В результате вы получите рекомендации, даже если не станете нашим клиентом.",
            },
            {
              q: "Работаете ли вы с иногородними клиентами?",
              a: "Да, работаем по всей России и с международными клиентами удалённо. Все встречи онлайн, документооборот — электронный.",
            },
          ].map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}