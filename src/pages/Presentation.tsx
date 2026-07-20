import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Icon from "@/components/ui/icon";
import { services, portfolio, technologies } from "@/components/shared";

const IMG_HERO = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/fe63940b-c7be-4f2d-b4f3-7deca4d6794e.jpg";
const IMG_AUTOMATION = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/65b16de8-4d39-4397-95d7-4a042ff7df40.jpg";
const IMG_ANALYTICS = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/712f5769-495c-40d3-b8b5-d5a7b7bf3d07.jpg";
const IMG_PARTNERSHIP = "https://cdn.poehali.dev/projects/290a2a79-ab7e-4f13-b5bc-e165f1d30061/files/735b25a2-6fe9-45b6-a943-2f4f7d75c5cf.jpg";

const stats = [
  { value: "12+", label: "Запущенных продуктов" },
  { value: "7–14", label: "Дней до первого результата" },
  { value: "6", label: "Направлений разработки" },
  { value: "24/7", label: "Работа AI-решений" },
];

const problems = [
  { icon: "Clock", title: "Рутина съедает время", desc: "Менеджеры вручную обрабатывают заявки, переносят данные, отвечают на одни и те же вопросы." },
  { icon: "TrendingDown", title: "Заявки теряются", desc: "Клиенты не получают ответ вовремя и уходят к конкурентам. Нет единой точки контроля." },
  { icon: "EyeOff", title: "Нет прозрачности", desc: "Руководитель не видит реальную картину: откуда приходят клиенты и где теряются деньги." },
];

const solutions = [
  { icon: "Bot", title: "AI берёт рутину на себя", desc: "Умные ассистенты обрабатывают заявки и отвечают клиентам 24/7 — без расширения штата." },
  { icon: "Zap", title: "Все процессы связаны", desc: "Сайт, CRM, мессенджеры и почта работают как единый автоматический поток." },
  { icon: "BarChart3", title: "Полная аналитика", desc: "Дашборды в реальном времени: заявки, конверсия, работа менеджеров — как на ладони." },
];

const workflow = [
  { step: "01", title: "Бесплатный разбор", desc: "Изучаем процессы, находим точки роста и оцениваем эффект" },
  { step: "02", title: "План внедрения", desc: "Конкретный план с задачами, сроками и ожидаемым результатом" },
  { step: "03", title: "Разработка", desc: "Создаём и настраиваем решение под ваши процессы" },
  { step: "04", title: "Интеграция", desc: "Подключаем к вашим системам: сайт, CRM, мессенджеры" },
  { step: "05", title: "Запуск и поддержка", desc: "Запускаем, обучаем команду, сопровождаем" },
];

const Slide = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`slide relative min-h-screen w-full flex flex-col justify-center px-8 md:px-20 py-16 ${className}`}>
    {children}
  </section>
);

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-block px-4 py-1.5 rounded-full text-sm text-violet-700 bg-violet-50 border border-violet-200 mb-6 font-medium">
    {children}
  </div>
);

export default function Presentation() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!rootRef.current || downloading) return;
    setDownloading(true);
    try {
      const slides = Array.from(rootRef.current.querySelectorAll<HTMLElement>(".slide"));
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slides.length; i++) {
        const canvas = await html2canvas(slides[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;
        const y = imgH < pageH ? (pageH - imgH) / 2 : 0;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, y, imgW, Math.min(imgH, pageH));
      }
      pdf.save("Презентация-МАТ-Лабс.pdf");
    } catch (e) {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div ref={rootRef} className="bg-white text-slate-900 min-h-screen">
      <Helmet>
        <title>Презентация — ООО МАТ-Лабс</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <style>{`
        .p-card { background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        @media print {
          .no-print { display: none !important; }
          .slide { min-height: auto !important; page-break-after: always; padding-top: 40px; padding-bottom: 40px; }
          body, .bg-white { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Floating action buttons */}
      <div className="no-print fixed bottom-6 right-6 z-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={() => window.print()}
          className="glass border border-slate-300 bg-white/90 backdrop-blur px-5 py-3 rounded-2xl font-semibold text-slate-700 flex items-center justify-center gap-2 shadow-lg hover:bg-white transition-all"
        >
          <Icon name="Printer" size={18} />
          Печать
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="btn-gradient px-5 py-3 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 shadow-lg glow-purple disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <><Icon name="Loader2" size={18} className="animate-spin" />Готовим PDF…</>
          ) : (
            <><Icon name="Download" size={18} />Скачать PDF</>
          )}
        </button>
      </div>

      {/* SLIDE 1 — TITLE */}
      <section className="slide relative min-h-screen w-full flex items-center justify-center px-8 md:px-20 py-16 overflow-hidden">
        <img src={IMG_HERO} alt="Футуристичный офис МАТ-Лабс" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0618]/90 via-[#160b2e]/80 to-[#0a0618]/90" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center max-w-5xl">
          <div className="w-16 h-16 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-8 shadow-lg glow-purple">
            <span className="font-oswald font-bold text-2xl text-white">МЛ</span>
          </div>
          <div className="inline-block px-4 py-1.5 rounded-full text-sm text-violet-200 bg-white/10 border border-white/20 mb-8 backdrop-blur">
            ООО «МАТ-Лабс»
          </div>
          <h1 className="font-oswald text-4xl md:text-7xl font-bold mb-6 text-white leading-tight">
            Больше заявок.<br />
            <span className="gradient-text">Меньше рутины.</span><br />
            Всё на автопилоте.
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto mb-4">
            Автоматизируем бизнес-процессы и увеличиваем поток заявок с помощью искусственного интеллекта
          </p>
          <p className="text-white/50 max-w-2xl mx-auto">
            Прозрачные процессы и первый результат уже через 7–14 дней
          </p>
        </div>
      </section>

      {/* SLIDE 2 — ABOUT + STATS */}
      <Slide>
        <Kicker>О компании</Kicker>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-6">
              IT-компания полного цикла: от идеи до работающего продукта
            </h2>
            <p className="text-lg text-slate-600 mb-10">
              Мы помогаем компаниям снизить ручную работу, ускорить обработку клиентов и зарабатывать больше.
              Разрабатываем сайты, внедряем AI и строим аналитику — и создаём собственные цифровые продукты,
              которые уже работают на рынке.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s, i) => (
                <div key={i} className="p-card rounded-2xl p-5 text-center">
                  <div className="font-oswald text-3xl font-bold gradient-text mb-1">{s.value}</div>
                  <div className="text-sm text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-violet-200">
            <img src={IMG_PARTNERSHIP} alt="Партнёрство человека и AI" className="w-full h-[320px] md:h-[480px] object-cover" />
          </div>
        </div>
      </Slide>

      {/* SLIDE 3 — PROBLEM / SOLUTION */}
      <Slide>
        <Kicker>Зачем это бизнесу</Kicker>
        <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-8 max-w-4xl">
          Превращаем потери в прибыль
        </h2>
        <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-slate-200 mb-10">
          <img src={IMG_AUTOMATION} alt="Автоматизация бизнес-процессов" className="w-full h-[160px] md:h-[220px] object-cover" />
        </div>
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <div className="flex items-center gap-2 text-rose-600 mb-5 font-semibold">
              <Icon name="AlertTriangle" size={20} /> Проблемы бизнеса
            </div>
            <div className="space-y-4">
              {problems.map((p, i) => (
                <div key={i} className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex gap-4">
                  <Icon name={p.icon} size={22} className="text-rose-500 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">{p.title}</div>
                    <div className="text-sm text-slate-500">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-5 font-semibold">
              <Icon name="CheckCircle2" size={20} /> Наши решения
            </div>
            <div className="space-y-4">
              {solutions.map((s, i) => (
                <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex gap-4">
                  <Icon name={s.icon} size={22} className="text-emerald-500 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">{s.title}</div>
                    <div className="text-sm text-slate-500">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* SLIDE 4 — SERVICES */}
      <Slide>
        <Kicker>Услуги</Kicker>
        <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-10 max-w-4xl">
          6 направлений разработки
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => (
            <div key={i} className="p-card rounded-2xl p-6 flex flex-col">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4`}>
                <Icon name={s.icon} size={22} className="text-white" />
              </div>
              <h3 className="font-oswald text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 flex-1 mb-4">{s.desc}</p>
              <div className={`text-sm font-semibold border rounded-lg px-3 py-1.5 w-fit ${s.tagColor}`}>
                {s.price}
              </div>
            </div>
          ))}
        </div>
      </Slide>

      {/* SLIDE 5 — ECOSYSTEM / PORTFOLIO */}
      <Slide>
        <Kicker>Экосистема продуктов</Kicker>
        <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-4 max-w-4xl">
          {portfolio.length} собственных продуктов, которые уже работают
        </h2>
        <p className="text-slate-500 max-w-3xl mb-10">
          Мы не только делаем проекты на заказ — мы создаём и развиваем собственные цифровые продукты.
          Это подтверждает нашу экспертизу на реальных, живых сервисах.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolio.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="p-card rounded-2xl p-5 flex flex-col hover:ring-2 hover:ring-violet-300 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <img src={p.icon} alt={p.title} loading="lazy" className={`w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200 bg-gradient-to-br ${p.color} flex-shrink-0`} />
                <div className="min-w-0">
                  <h3 className="font-oswald text-lg font-bold text-slate-900 leading-tight truncate">{p.title}</h3>
                  <span className="text-[11px] text-slate-400">{p.category}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 flex-1 mb-3 leading-relaxed">{p.desc}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.tech.map((t, k) => (
                  <span key={k} className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-violet-600 font-medium mt-auto">
                <Icon name="ExternalLink" size={12} />
                {p.url.replace(/^https?:\/\//, "")}
              </div>
            </a>
          ))}
        </div>
      </Slide>

      {/* SLIDE 6 — WORKFLOW */}
      <Slide>
        <Kicker>Как мы работаем</Kicker>
        <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-10 max-w-4xl">
          Прозрачный процесс за 5 шагов
        </h2>
        <div className="grid md:grid-cols-5 gap-4">
          {workflow.map((w, i) => (
            <div key={i} className="p-card rounded-2xl p-5">
              <div className="font-oswald text-3xl font-bold gradient-text mb-3">{w.step}</div>
              <div className="font-semibold text-slate-900 mb-2">{w.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{w.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 grid lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
            <Icon name="Gift" size={26} className="text-emerald-500 flex-shrink-0" />
            <p className="text-slate-600">
              <span className="text-slate-900 font-semibold">Первый разбор — бесплатно.</span> Покажем, что и как можно
              автоматизировать в вашем бизнесе, без обязательств.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-200">
            <img src={IMG_ANALYTICS} alt="Аналитика и дашборды в реальном времени" className="w-full h-full min-h-[140px] object-cover" />
          </div>
        </div>
      </Slide>

      {/* SLIDE 7 — TECH */}
      <Slide>
        <Kicker>Технологии</Kicker>
        <h2 className="font-oswald text-4xl md:text-5xl font-bold mb-10 max-w-4xl">
          Современный и надёжный стек
        </h2>
        <div className="flex flex-wrap gap-3">
          {technologies.map((t, i) => (
            <div key={i} className="p-card rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                <div className="text-xs text-slate-400">{t.category}</div>
              </div>
            </div>
          ))}
        </div>
      </Slide>

      {/* SLIDE 8 — CONTACTS / CTA */}
      <Slide className="items-center text-center bg-gradient-to-t from-violet-50 to-transparent">
        <h2 className="font-oswald text-4xl md:text-6xl font-bold mb-6">
          Обсудим ваш <span className="gradient-text">проект?</span>
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mb-8">
          Расскажите о своих задачах — подготовим бесплатный разбор и покажем, как автоматизация
          принесёт вам больше заявок и меньше рутины.
        </p>
        <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-violet-200 mb-10">
          <img src={IMG_ANALYTICS} alt="Технологичное будущее вашего бизнеса" className="w-full h-[200px] md:h-[260px] object-cover" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-8 w-full max-w-2xl">
          <a href="tel:+79277486868" className="p-card rounded-2xl p-6 flex items-center gap-4 hover:border-violet-500/50 transition-all">
            <div className="w-11 h-11 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Phone" size={20} className="text-cyan-600" />
            </div>
            <div className="text-left">
              <div className="text-xs text-slate-400">Телефон</div>
              <div className="text-slate-900 font-semibold">+7 (927) 748-68-68</div>
            </div>
          </a>
          <a href="mailto:maksT77@yandex.ru" className="p-card rounded-2xl p-6 flex items-center gap-4 hover:border-violet-500/50 transition-all">
            <div className="w-11 h-11 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Mail" size={20} className="text-pink-600" />
            </div>
            <div className="text-left">
              <div className="text-xs text-slate-400">Email</div>
              <div className="text-slate-900 font-semibold">maksT77@yandex.ru</div>
            </div>
          </a>
        </div>
        <a href="https://mat-labs.ru" className="btn-gradient px-8 py-4 rounded-2xl font-semibold text-white text-lg glow-purple inline-flex items-center gap-2">
          Перейти на сайт mat-labs.ru <Icon name="ArrowRight" size={20} />
        </a>
        <p className="text-slate-400 text-sm mt-10">© 2026 ООО МАТ-Лабс. Все права защищены</p>
      </Slide>
    </div>
  );
}