import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User as UserIcon, LogOut, LayoutDashboard, Shield, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { NotificationDropdown } from "@/components/NotificationDropdown";


const NAV_LINKS = [
  { label: "Explore Fleet", href: "/cars" },
  { label: "Services", href: "/services" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setUserDropdown(false);
  }, [location]);

  // Click outside and Escape key listener for user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdown(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserDropdown(false);
      }
    }

    if (userDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userDropdown]);

  const navBase = isHome && !scrolled ? "text-white" : "text-slate-800";

  const bgClass =
    scrolled || !isHome
      ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100"
      : "bg-transparent";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isStaffOrAdmin = user && ["ADMIN", "MANAGER", "STAFF"].includes((user.role || "").toUpperCase());

  return (
    <header className={cn("fixed top-0 inset-x-0 z-50 transition-all duration-300", bgClass)}>
      <div className="max-w-[1336px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-18 items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src="/assets/brand/logo-circle.png"
              alt="Swaraj Tours & Travel"
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-full ring-1 ring-amber-400/40 shadow-sm transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col leading-none">
              <span className="text-base sm:text-lg font-black tracking-wide text-amber-500 group-hover:text-amber-400 transition-colors drop-shadow-sm">
                SWARAJ
              </span>
              <span className={cn("text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase mt-0.5 transition-colors", isHome && !scrolled ? "text-slate-200" : "text-slate-700")}>
                TOURS & TRAVEL
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-blue-50 hover:text-blue-600",
                  location.pathname === link.href ? "text-blue-600" : navBase
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="flex items-center gap-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-800 shadow-sm transition-all h-10"
                    aria-expanded={userDropdown}
                    aria-haspopup="true"
                  >
                    <div className="h-7 w-7 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xs font-bold">
                      {user.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold max-w-[120px] truncate">{user.full_name}</span>
                    {user.role && user.role.toUpperCase() !== "CUSTOMER" && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {user.role.toUpperCase()}
                      </span>
                    )}
                  </button>

                  {userDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 animate-in fade-in-0 zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold truncate text-slate-900">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setUserDropdown(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                            location.pathname === "/dashboard"
                              ? "bg-orange-50 text-orange-600 font-bold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <LayoutDashboard className="h-4 w-4 text-orange-500" /> Dashboard
                        </Link>

                        <Link
                          to="/bookings"
                          onClick={() => setUserDropdown(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                            location.pathname === "/bookings"
                              ? "bg-orange-50 text-orange-600 font-bold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <Calendar className="h-4 w-4 text-slate-500" /> My Bookings
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setUserDropdown(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                            location.pathname === "/profile"
                              ? "bg-orange-50 text-orange-600 font-bold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <UserIcon className="h-4 w-4 text-slate-500" /> Account Profile
                        </Link>

                        {isStaffOrAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdown(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                              location.pathname.startsWith("/admin")
                                ? "bg-amber-50 text-amber-700 font-bold"
                                : "text-amber-600 hover:bg-amber-50"
                            )}
                          >
                            <Shield className="h-4 w-4" /> Management Console
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        onClick={() => {
                          setUserDropdown(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant={isHome && !scrolled ? "outline-dark" : "ghost"} size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="lg:hidden flex items-center gap-2">
            {isAuthenticated && user && <NotificationDropdown />}
            <button
              className={cn("p-2 rounded-lg transition-colors", navBase)}
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden bg-white border-b border-slate-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated && user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Button>
                  </Link>
                  <Link to="/bookings" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Calendar className="h-4 w-4" /> My Bookings
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <UserIcon className="h-4 w-4" /> My Profile
                    </Button>
                  </Link>
                  {isStaffOrAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-amber-600">
                        <Shield className="h-4 w-4" /> Management Console
                      </Button>
                    </Link>
                  )}
                  <Button variant="destructive" size="sm" className="w-full justify-start gap-2" onClick={() => { setOpen(false); handleLogout(); }}>
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
