import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import NavBar from "@/components/NavBar";
import TopSections from "@/components/TopSections";
import BottomSections from "@/components/BottomSections";
import Breadcrumbs from "@/components/Breadcrumbs";
import Icon from "@/components/ui/icon";

export default function Index() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollTo(href: string) {
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
      <Helmet>
        <title>MAT Labs — AI-автоматизация бизнеса | Внедрение за 7–14 дней</title>
        <meta name="description" content="MAT Labs автоматизирует бизнес-процессы с помощью AI: обработка заявок, интеграция с CRM, создание сайтов. Внедрение за 7–14 дней. Бесплатный разбор." />
        <meta name="keywords" content="AI автоматизация бизнеса, автоматизация заявок, внедрение ИИ, интеграция CRM, автоматизация процессов, MAT Labs, МАТ Лабс" />
        <link rel="canonical" href="https://mat-labs.ru/" />
        <meta property="og:url" content="https://mat-labs.ru/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="MAT Labs — AI-автоматизация бизнеса | Внедрение за 7–14 дней" />
        <meta property="og:description" content="Помогаем снижать нагрузку на сотрудников, ускорять процессы и увеличивать заявки без расширения штата. Бесплатный разбор." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MAT Labs — AI-автоматизация бизнеса" />
        <meta name="twitter:description" content="Внедряем AI для обработки заявок, автоматизируем рутину, создаём сайты. Результат за 7–14 дней." />
      </Helmet>
      <NavBar
        scrolled={scrolled}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        scrollTo={scrollTo}
      />
      <TopSections
        scrollTo={scrollTo}
        statsRef={statsRef}
      />
      <BottomSections scrollTo={scrollTo} />
      <Breadcrumbs />

      {/* Floating consultant button */}
      <button
        onClick={() => navigate("/consultant")}
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl shadow-lg shadow-cyan-500/30 px-4 py-3 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/50"
      >
        <div className="relative">
          <Icon name="MessageCircle" size={22} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <span className="text-sm font-semibold whitespace-nowrap">AI-консультант</span>
      </button>
    </div>
  );
}