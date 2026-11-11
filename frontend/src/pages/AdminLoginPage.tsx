import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldAlert, CheckCircle2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/core/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import {
  validateEmail,
  validatePassword,
  formatAuthError,
} from "@/utils/authValidation";

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field errors
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  // General alert error
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // 1. Client-side field validations
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, false);

    const errors: { email?: string; password?: string } = {};
    if (!emailValidation.isValid) errors.email = emailValidation.message;
    if (!passwordValidation.isValid) errors.password = passwordValidation.message;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const role = (user.role || "").toUpperCase();

      // Enforce strict Admin authorization check
      if (role !== "ADMIN" && role !== "MANAGER") {
        await logout();
        setGeneralError("Access denied. This console is restricted to administrators only.");
        return;
      }

      // Successful admin login: redirect directly to Admin Dashboard
      navigate("/admin");
    } catch (err: unknown) {
      const msg = formatAuthError(err, "Incorrect email or password.");
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setForgotStatus(res.message);
    } catch (err: unknown) {
      setForgotStatus(formatAuthError(err, "Failed to request password reset."));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top Header */}
      <AuthHeader currentView="admin" />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full mx-auto">
          {/* Card Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl">
            {/* Header Icon & Title */}
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-4">
                <ShieldCheck className="h-4 w-4" />
                <span>Executive Access Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Admin Console
              </h1>
              <p className="text-sm font-semibold text-amber-400/90 mt-1">
                Manage Your Business Operations
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Secure access to bookings, fleet management, customers and business operations.
              </p>
            </div>

            {/* Error Alert */}
            {generalError && (
              <div
                role="alert"
                className="mb-6 p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in"
              >
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="font-medium">{generalError}</p>
              </div>
            )}

            {!showForgot ? (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Admin Email */}
                <div>
                  <label htmlFor="admin-email" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                    Admin Email Address <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@swarajtravels.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      required
                      autoComplete="email"
                      className={`h-11 sm:h-12 text-sm pl-10 bg-slate-950/70 border-slate-700 text-white rounded-xl placeholder:text-slate-500 ${
                        fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-amber-500"
                      }`}
                    />
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="admin-password" className="text-xs sm:text-sm font-semibold text-slate-300">
                      Password <span className="text-amber-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(true);
                        setForgotEmail(email);
                        setGeneralError(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      required
                      autoComplete="current-password"
                      className={`h-11 sm:h-12 text-sm pl-10 pr-10 bg-slate-950/70 border-slate-700 text-white rounded-xl placeholder:text-slate-500 ${
                        fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-amber-500"
                      }`}
                    />
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Sign-In Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 sm:h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Authenticating…
                      </span>
                    ) : (
                      <>
                        Sign In <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* Forgot password */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotStatus && (
                  <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{forgotStatus}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                    Enter Admin Email Address
                  </label>
                  <Input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@swarajtravels.com"
                    className="h-11 bg-slate-950 border-slate-700 text-white rounded-xl"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => setShowForgot(false)}
                  >
                    Back to Sign In
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Sending…" : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            )}

            {/* Footer Notice */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-500">
                Authorized Personnel Only • Audit Logging Active
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
