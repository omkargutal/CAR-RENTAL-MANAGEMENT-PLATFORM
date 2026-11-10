import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/core/api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryFrom = new URLSearchParams(location.search).get("from");
  const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const fromLocation = queryFrom || stateFrom || "/dashboard";
  const isAdminLogin = location.pathname.startsWith("/admin") || fromLocation.startsWith("/admin") || queryFrom === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      const role = (loggedInUser.role || "").toUpperCase();
      if (role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate(fromLocation);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid email or password.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setForgotStatus(res.message);
    } catch (err: unknown) {
      setForgotStatus(err instanceof Error ? err.message : "Failed to request password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 group">
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

          <div className="mb-8">
            {isAdminLogin ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 mb-3">
                  Admin Portal Login
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Sign in to Admin Console</h1>
                <p className="text-slate-500">Enter your administrative credentials to manage fleet and bookings.</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome Back</h1>
                <p className="text-slate-500">Sign in to your account to manage rides and bookings.</p>
              </>
            )}
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Failed</p>
                <p className="text-xs mt-0.5 text-red-600">{errorMessage}</p>
              </div>
            </div>
          )}

          {!showForgot ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setForgotEmail(email);
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign In <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-4">
                <h3 className="text-sm font-bold text-blue-900 mb-1">Reset your password</h3>
                <p className="text-xs text-blue-700">
                  Enter your email address and we'll send you instructions to reset your password.
                </p>
              </div>

              {forgotStatus && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{forgotStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
                <Input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForgot(false)}
                >
                  Back to Login
                </Button>
                <Button type="submit" className="flex-1" disabled={forgotLoading}>
                  {forgotLoading ? "Sending…" : "Send Reset Link"}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:block relative bg-slate-950 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80"
          alt="Luxury car"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-900/60 to-indigo-900/80" />
        <div className="relative h-full flex items-end p-12">
          <div>
            <blockquote className="text-white text-xl font-medium leading-relaxed mb-4">
              "Swaraj Tours & Travel made our trip comfortable and seamless. Clean cars, on-time pickup, and reliable service every time."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">ST</div>
              <div>
                <p className="text-white font-semibold">Swaraj Tours & Travel</p>
                <p className="text-blue-300 text-sm">24/7 Cab & Tour Booking Service</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
