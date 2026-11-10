import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

const PERKS = [
  "Instant booking confirmation",
  "Free cancellation up to 24 hours",
  "Experienced & verified drivers",
  "24/7 dedicated customer support",
];

export function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (form.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        phone_number: form.phone.trim() || undefined,
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Visual */}
      <div className="hidden lg:flex flex-col justify-between relative bg-slate-950 overflow-hidden p-12">
        <img
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80"
          alt="Premium car"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-slate-950/90" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/assets/brand/logo-circle.png"
              alt="Swaraj Tours & Travel"
              className="h-10 w-10 object-contain rounded-full ring-1 ring-amber-400/40 shadow-sm transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-wide text-amber-500">
                SWARAJ
              </span>
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-200 mt-0.5">
                TOURS & TRAVEL
              </span>
            </div>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-extrabold text-white mb-6">
            Join 12,000+ happy travelers
          </h2>
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-slate-200">
                <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-slate-400">
          © 2026 Swaraj Tours & Travel. All rights reserved. Secure & Encrypted.
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 bg-white overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-8 lg:hidden group">
            <img
              src="/assets/brand/logo-circle.png"
              alt="Swaraj Tours & Travel"
              className="h-10 w-10 object-contain rounded-full ring-1 ring-amber-400/40 shadow-sm transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-wide text-amber-500">
                SWARAJ
              </span>
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-700 mt-0.5">
                TOURS & TRAVEL
              </span>
            </div>
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Create an account</h1>
            <p className="text-slate-500">Get access to seamless cab bookings and mobility in seconds</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Error</p>
                <p className="text-xs mt-0.5 text-red-600">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">First name</label>
                <Input
                  placeholder="John"
                  value={form.firstName}
                  onChange={set("firstName")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last name</label>
                <Input
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={set("lastName")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone number (optional)</label>
              <Input
                type="tel"
                placeholder="+91 8421081570"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set("password")}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" size="lg" className="w-full gap-2 mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
