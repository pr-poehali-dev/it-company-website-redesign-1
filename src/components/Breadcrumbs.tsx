import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const sections = [
  { id: "hero", label: "Главная" },
  { id: "about", label: "О компании" },
  { id: "services", label: "Услуги" },
  { id: "portfolio", label: "Портфолио" },
  { id: "technologies", label: "Технологии" },
  { id: "career", label: "Карьера" },
  { id: "blog", label: "Блог" },
  { id: "contacts", label: "Контакты" },
];

export default function Breadcrumbs() {
  const [active, setActive] = useState("hero");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            setVisible(entry.target.id !== "hero");
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const activeIndex = sections.findIndex(s => s.id === active);
  const crumbs = activeIndex > 0 ? sections.slice(0, activeIndex + 1) : [];

  if (!visible || crumbs.length === 0) return null;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav
      aria-label="Хлебные крошки"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up"
    >
      <ol
        className="flex items-center gap-1 glass border border-white/10 rounded-2xl px-4 py-2.5 text-xs backdrop-blur-md"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {crumbs.map((crumb, i) => (
          <li
            key={crumb.id}
            className="flex items-center gap-1"
            itemScope
            itemProp="itemListElement"
            itemType="https://schema.org/ListItem"
          >
            {i > 0 && (
              <Icon name="ChevronRight" size={10} className="text-white/20 flex-shrink-0" />
            )}
            <button
              onClick={() => scrollTo(crumb.id)}
              itemProp="item"
              className={`transition-all duration-200 px-1.5 py-0.5 rounded-lg ${
                i === crumbs.length - 1
                  ? "text-white font-semibold"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <span itemProp="name">{crumb.label}</span>
            </button>
            <meta itemProp="position" content={String(i + 1)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
