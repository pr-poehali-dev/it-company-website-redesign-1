import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";
import { ymGoal } from "@/lib/ym";

export default function FinalCtaSection({ scrollTo }: { scrollTo: (href: string) => void }) {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-4xl mx-auto px-6 relative">
        <AnimatedSection>
          <div className="glass neon-border rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-emerald-300 border border-emerald-500/30 mb-8">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Бесплатный разбор — без обязательств
              </div>

              <h2 className="font-oswald text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Начните с{" "}
                <span className="gradient-text">простого шага</span>
              </h2>

              <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto mb-3">
                Оставьте заявку и получите разбор ваших процессов с конкретными рекомендациями.
              </p>

              <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-white/40 mb-10">
                {[
                  "где теряются заявки",
                  "что можно автоматизировать",
                  "как снизить нагрузку на сотрудников",
                ].map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <Icon name="ChevronRight" size={13} className="text-violet-400" />
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => { ymGoal("cta_click", { source: "final_cta" }); scrollTo("#contacts"); }}
                  className="btn-gradient px-10 py-4 rounded-2xl text-base font-semibold text-white glow-purple flex items-center justify-center gap-2"
                >
                  Оставить заявку
                  <Icon name="ArrowRight" size={18} />
                </button>
                <a
                  href="https://t.me/mat_labs"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => ymGoal("telegram_click")}
                  className="glass px-10 py-4 rounded-2xl text-base font-semibold text-white hover:bg-white/10 transition-all duration-300 border border-white/20 flex items-center justify-center gap-2"
                >
                  <Icon name="MessageCircle" size={18} />
                  Написать в Telegram
                </a>
              </div>

              <div className="flex flex-wrap justify-center gap-6 mt-10 pt-10 border-t border-white/10">
                {[
                  { icon: "Zap", text: "Ответ в течение 24 часов" },
                  { icon: "Shield", text: "Без обязательств" },
                  { icon: "Gift", text: "Бесплатно" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/40 text-sm">
                    <Icon name={item.icon} size={15} className="text-violet-400" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}