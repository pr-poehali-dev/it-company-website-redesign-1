import { useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import TopSections from "@/components/TopSections";
import BottomSections from "@/components/BottomSections";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Index() {
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
    </div>
  );
}