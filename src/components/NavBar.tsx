import Icon from "@/components/ui/icon";
import { navLinks } from "@/components/shared";

interface NavBarProps {
  scrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  scrollTo: (href: string) => void;
}

export default function NavBar({ scrolled, menuOpen, setMenuOpen, scrollTo }: NavBarProps) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "glass border-b border-white/10 py-3" : "py-5"}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg btn-gradient flex items-center justify-center">
            <span className="relative z-10 text-white font-oswald font-bold text-sm">NT</span>
          </div>
          <span className="font-oswald font-bold text-xl tracking-wider gradient-text">NexaTech</span>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
            >
              {link.label}
            </button>
          ))}
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
          {navLinks.map(link => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="w-full text-left px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 text-sm"
            >
              {link.label}
            </button>
          ))}
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
