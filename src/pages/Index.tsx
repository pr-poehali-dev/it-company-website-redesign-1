import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import TopSections from "@/components/TopSections";
import BottomSections from "@/components/BottomSections";
import Breadcrumbs from "@/components/Breadcrumbs";
import Icon from "@/components/ui/icon";

export default function Index() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [counter, setCounter] = useState({ projects: 0, years: 0, clients: 0, team: 0 });
  const statsRef = useRef<HTMLDivElement>(null);
  const statsAnimated = useRef(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsAnimated.current) {
          statsAnimated.current = true;
          animateCounters();
        }
      },
      { threshold: 0.5 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  function animateCounters() {
    const duration = 2000;
    const targets = { projects: 200, years: 2026, clients: 98, team: 50 };
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounter({
        projects: Math.floor(ease * targets.projects),
        years: Math.floor(ease * targets.years),
        clients: Math.floor(ease * targets.clients),
        team: Math.floor(ease * targets.team),
      });
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function scrollTo(href: string) {
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#080812] text-white font-golos overflow-x-hidden">
      <NavBar
        scrolled={scrolled}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        scrollTo={scrollTo}
      />
      <TopSections
        scrollTo={scrollTo}
        counter={counter}
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