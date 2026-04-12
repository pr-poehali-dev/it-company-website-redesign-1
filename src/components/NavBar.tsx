import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { navLinks, services } from "@/components/shared";

interface NavBarProps {
  scrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  scrollTo: (href: string) => void;
}

export default function NavBar({ scrolled, menuOpen, setMenuOpen, scrollTo }: NavBarProps) {
  const navigate = useNavigate();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "glass border-b border-white/10 py-3" : "py-5"}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-9 h-9 rounded-lg btn-gradient flex items-center justify-center">
            <span className="relative z-10 text-white font-oswald font-bold text-sm">МЛ</span>
          </div>
          <span className="font-oswald font-bold text-xl tracking-wider gradient-text">МАТ-Лабс</span>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => {
            if (link.href === "#services") {
              return (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 flex items-center gap-1"
                  >
                    {link.label}
                    <Icon name="ChevronDown" size={14} className={`transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
                  </button>

                  {servicesOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-72">
                      <div className="glass border border-white/10 rounded-2xl p-2 shadow-xl shadow-black/40">
                        {services.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { navigate(`/services/${s.slug}`); setServicesOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
                          >
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                              <Icon name={s.icon} size={14} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white/80 group-hover:text-white transition-colors">{s.title}</div>
                              <div className="text-xs text-white/30">{s.price}</div>
                            </div>
                            <Icon name="ArrowRight" size={12} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
              >
                {link.label}
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex">
          <button
            onClick={() => scrollTo("#contacts")}
            className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          >
            <span>Связаться</span>
          </button>
        </div>

        <button className="lg:hidden p-2 rounded-lg glass" onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? "X" : "Menu"} size={22} />
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden glass border-t border-white/10 mt-2 mx-4 rounded-2xl p-4">
          {navLinks.map(link => {
            if (link.href === "#services") {
              return (
                <div key={link.href}>
                  <button
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    className="w-full text-left px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 text-sm flex items-center justify-between"
                  >
                    {link.label}
                    <Icon name="ChevronDown" size={14} className={`transition-transform duration-200 ${mobileServicesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {mobileServicesOpen && (
                    <div className="ml-4 mb-2 space-y-1">
                      {services.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { navigate(`/services/${s.slug}`); setMenuOpen(false); setMobileServicesOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all text-left"
                        >
                          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                            <Icon name={s.icon} size={12} className="text-white" />
                          </div>
                          <span className="text-sm text-white/70">{s.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="w-full text-left px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 text-sm"
              >
                {link.label}
              </button>
            );
          })}
          <button
            onClick={() => scrollTo("#contacts")}
            className="btn-gradient w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white"
          >
            <span>Связаться с нами</span>
          </button>
        </div>
      )}
    </nav>
  );
}
