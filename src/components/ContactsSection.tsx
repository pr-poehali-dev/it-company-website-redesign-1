import { useState } from "react";
import Icon from "@/components/ui/icon";
import { navLinks, AnimatedSection } from "@/components/shared";

const CONTACT_URL = "https://functions.poehali.dev/0c33a6f9-4b7e-4dc3-8c2e-6db6eadb5f1d";

interface ContactsSectionProps {
  scrollTo: (href: string) => void;
}

export default function ContactsSection({ scrollTo }: ContactsSectionProps) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.message.trim()) {
      setFormError("Заполните обязательные поля: Имя, Email, Телефон, Сообщение");
      return;
    }
    setFormStatus("sending");
    try {
      const res = await fetch(CONTACT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setFormStatus("success");
        setForm({ name: "", company: "", email: "", phone: "", message: "" });
      } else {
        setFormError(data.error || "Ошибка отправки");
        setFormStatus("error");
      }
    } catch {
      setFormError("Ошибка соединения. Попробуйте ещё раз.");
      setFormStatus("error");
    }
  };

  return (
    <>
      {/* CTA */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/50 via-purple-900/50 to-indigo-900/50" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl animate-float-reverse" />
        <AnimatedSection>
          <div className="max-w-4xl mx-auto px-6 text-center relative">
            <h2 className="font-oswald text-4xl md:text-6xl font-bold mb-6">
              Готовы запустить{" "}
              <span className="gradient-text">следующий проект?</span>
            </h2>
            <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
              Оставьте заявку — наш менеджер свяжется с вами в течение 2 часов
            </p>
            <button
              onClick={() => scrollTo("#contacts")}
              className="btn-gradient px-10 py-5 rounded-2xl text-lg font-semibold text-white glow-purple"
            >
              <span>Обсудить проект бесплатно</span>
            </button>
          </div>
        </AnimatedSection>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-sm text-violet-300 border border-violet-500/30 mb-6">
              Контакты
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4">
              Начнём{" "}
              <span className="gradient-text">прямо сейчас</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Расскажите о вашем проекте — мы предложим оптимальное решение</p>
          </AnimatedSection>

          <div className="grid lg:grid-cols-2 gap-12">
            <AnimatedSection>
              <div className="glass neon-border rounded-3xl p-8">
                <div className="space-y-5">
                  {formStatus === "success" ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <Icon name="CheckCircle" size={32} className="text-emerald-400" />
                      </div>
                      <h3 className="font-oswald text-2xl font-bold text-white">Заявка отправлена!</h3>
                      <p className="text-white/50 text-sm">Наш менеджер свяжется с вами в течение 2 часов</p>
                      <button
                        onClick={() => setFormStatus("idle")}
                        className="glass border border-white/20 px-6 py-2 rounded-xl text-sm text-white/70 hover:text-white transition-all"
                      >
                        Отправить ещё
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-white/60 mb-2">Имя *</label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleFormChange}
                            placeholder="Иван Иванов"
                            className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-white/60 mb-2">Компания</label>
                          <input
                            type="text"
                            name="company"
                            value={form.company}
                            onChange={handleFormChange}
                            placeholder="ООО «Рога и Копыта»"
                            className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleFormChange}
                          placeholder="ivan@company.ru"
                          className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Телефон *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleFormChange}
                          placeholder="+7 (999) 000-00-00"
                          className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Расскажите о проекте *</label>
                        <textarea
                          rows={4}
                          name="message"
                          value={form.message}
                          onChange={handleFormChange}
                          placeholder="Опишите задачу, бюджет, сроки..."
                          className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm resize-none"
                        />
                      </div>
                      {formError && (
                        <p className="text-red-400 text-sm">{formError}</p>
                      )}
                      <button
                        onClick={handleSubmit}
                        disabled={formStatus === "sending"}
                        className="btn-gradient w-full py-4 rounded-2xl font-semibold text-white text-base glow-purple disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center gap-2">
                          {formStatus === "sending" ? "Отправляем..." : "Отправить заявку"}
                          <Icon name={formStatus === "sending" ? "Loader" : "Send"} size={18} />
                        </span>
                      </button>
                      <p className="text-center text-white/30 text-xs">
                        Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
                      </p>
                    </>
                  )}
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div className="space-y-6">
                {[
                  { icon: "MapPin", title: "Офис", value: "Москва, Пресненская наб., 12, БЦ «Башня Федерация»", color: "text-violet-400", bg: "bg-violet-500/20" },
                  { icon: "Phone", title: "Телефон", value: "+7 (927) 748-68-68", color: "text-cyan-400", bg: "bg-cyan-500/20" },
                  { icon: "Mail", title: "Email", value: "maksT77@yandex.ru", color: "text-pink-400", bg: "bg-pink-500/20" },
                  { icon: "Clock", title: "Часы работы", value: "Пн–Пт: 9:00–19:00 МСК", color: "text-emerald-400", bg: "bg-emerald-500/20" },
                ].map((item, i) => (
                  <div key={i} className="glass neon-border rounded-2xl p-5 flex items-start gap-4 card-hover">
                    <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon name={item.icon} size={20} className={item.color} />
                    </div>
                    <div>
                      <div className="text-white/50 text-xs mb-1">{item.title}</div>
                      <div className="text-white font-medium text-sm">{item.value}</div>
                    </div>
                  </div>
                ))}

                <div className="glass neon-border rounded-2xl p-5">
                  <div className="text-white/50 text-xs mb-3">Мы в соцсетях</div>
                  <div className="flex gap-3">
                    {[
                      { icon: "MessageCircle", label: "Telegram" },
                      { icon: "Linkedin", label: "LinkedIn" },
                      { icon: "Github", label: "GitHub" },
                      { icon: "Youtube", label: "YouTube" },
                    ].map((s, i) => (
                      <button
                        key={i}
                        title={s.label}
                        className="w-10 h-10 glass border border-white/10 rounded-xl flex items-center justify-center hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-200 group"
                      >
                        <Icon name={s.icon} size={16} className="text-white/50 group-hover:text-violet-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
                <span className="relative z-10 text-white font-oswald font-bold text-xs">МЛ</span>
              </div>
              <span className="font-oswald font-bold text-lg gradient-text">МАТ-Лабс</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
              {navLinks.map(link => (
                <button key={link.href} onClick={() => scrollTo(link.href)} className="hover:text-white transition-colors">
                  {link.label}
                </button>
              ))}
            </div>
            <div className="text-white/30 text-sm text-center">
              © 2026 ООО МАТ-Лабс. Все права защищены
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
