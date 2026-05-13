import { AnimatedSection } from "@/components/shared";

export default function PartnersSection() {
  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <AnimatedSection className="text-center mb-10">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-amber-300 border border-amber-500/30 mb-6">
            Партнёры
          </div>
          <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-4">
            Официальный партнёр
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            ООО МАТ-Лабс является официальным партнёром торговой сети Лемана Про
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <div className="flex justify-center">
            <div className="glass neon-border rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 max-w-2xl w-full border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300">
              <div className="flex-shrink-0 bg-white rounded-2xl p-6 shadow-lg shadow-amber-500/10">
                <img
                  src="https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/bucket/4752ef0b-71cf-4bc8-ad7b-73cd52c32690.jpg"
                  alt="Лемана Про"
                  className="w-36 h-36 object-contain"
                />
              </div>
              <div className="text-center md:text-left">
                <div className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                  Официальный партнёр
                </div>
                <h3 className="font-oswald text-2xl font-bold text-white mb-2">Лемана Про</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Крупнейшая российская сеть строительных гипермаркетов. Совместно реализуем проекты по автоматизации бизнес-процессов и внедрению AI-решений.
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
