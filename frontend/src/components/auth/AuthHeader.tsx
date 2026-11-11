import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Car, Home, Phone, Info, Compass } from "lucide-react";

interface AuthHeaderProps {
  currentView?: "login" | "register" | "admin";
}

export function AuthHeader({ currentView: _currentView }: AuthHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 py-3 sm:px-8 transition-all duration-300">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand identity: Black + White + Vibrant Orange Accent */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/assets/brand/logo-circle.png"
            alt="Swaraj Tours & Travel"
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-full ring-1 ring-orange-500/30 shadow-sm transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col leading-none">
            <span className="text-lg sm:text-xl font-black tracking-tight text-zinc-950 flex items-center">
              SWARAJ<span className="text-orange-500 ml-0.5">.</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase text-zinc-500 mt-0.5">
              TOURS & TRAVEL
            </span>
          </div>
        </Link>

        {/* Hamburger Menu Toggle */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-zinc-700 hover:text-orange-600 hover:bg-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="pt-3 pb-2 border-t border-zinc-100 mt-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 bg-white rounded-2xl p-2 shadow-xl border border-zinc-100">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            <Home className="h-4 w-4 text-zinc-400" /> Home
          </Link>
          <Link
            to="/cars"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            <Car className="h-4 w-4 text-zinc-400" /> Explore Fleet
          </Link>
          <Link
            to="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            <Compass className="h-4 w-4 text-zinc-400" /> Services & Tours
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            <Info className="h-4 w-4 text-zinc-400" /> About Us
          </Link>
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            <Phone className="h-4 w-4 text-zinc-400" /> Contact
          </Link>
        </div>
      )}
    </header>
  );
}
