import Icon from "@/components/ui/icon";
import { AnimatedSection } from "@/components/shared";

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
                <span className="gradient-text">бесплатного разбора</span>
              </h2>

              <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto mb-4">
                Покажем, какие процессы можно автоматизировать в вашем бизнесе
                и как увеличить количество заявок без расширения штата.
              </p>
              <p className="text-white/40 text-sm mb-10">
                Оставьте заявку — и получите конкретные рекомендации уже через 24 часа.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => scrollTo("#contacts")}
                  className="btn-gradient px-10 py-4 rounded-2xl text-base font-semibold text-white glow-purple flex items-center justify-center gap-2"
                >
                  Получить разбор
                  <Icon name="ArrowRight" size={18} />
                </button>
                <button
                  onClick={() => scrollTo("#what-we-do")}
                  className="glass px-10 py-4 rounded-2xl text-base font-semibold text-white hover:bg-white/10 transition-all duration-300 border border-white/20 flex items-center justify-center gap-2"
                >
                  <Icon name="PlayCircle" size={18} />
                  Как мы работаем
                </button>
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
