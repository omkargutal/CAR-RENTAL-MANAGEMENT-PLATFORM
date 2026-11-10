import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Car, Home, Phone, Info, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthHeaderProps {
  currentView: "login" | "register" | "admin";
}

export function AuthHeader({ currentView }: AuthHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand identity (No standalone "ST" letters) */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/assets/brand/logo-circle.png"
            alt="Swaraj Tours & Travel"
            className="h-9 w-9 object-contain rounded-full ring-1 ring-amber-400/40 shadow-sm transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-wide text-amber-500">
              SWARAJ
            </span>
            <span className="text-[9px] font-extrabold tracking-widest uppercase text-slate-700 mt-0.5">
              TOURS & TRAVEL
            </span>
          </div>
        </Link>

        {/* Right action & Hamburger */}
        <div className="flex items-center gap-2">
          {currentView === "login" && (
            <Link to="/register">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold border-amber-400/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg px-2.5 py-1.5 h-8"
              >
                Create Account
              </Button>
            </Link>
          )}

          {currentView === "register" && (
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold border-amber-400/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg px-2.5 py-1.5 h-8"
              >
                Sign In
              </Button>
            </Link>
          )}

          {currentView === "admin" && (
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg px-2.5 py-1.5 h-8"
              >
                Customer Portal
              </Button>
            </Link>
          )}

          {/* Hamburger toggle button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="pt-3 pb-2 border-t border-slate-100 mt-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <Home className="h-4 w-4 text-slate-400" /> Home
          </Link>
          <Link
            to="/cars"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <Car className="h-4 w-4 text-slate-400" /> Explore Fleet
          </Link>
          <Link
            to="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <Compass className="h-4 w-4 text-slate-400" /> Services & Tours
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <Info className="h-4 w-4 text-slate-400" /> About Us
          </Link>
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <Phone className="h-4 w-4 text-slate-400" /> Contact
          </Link>
        </div>
      )}
    </header>
  );
}
