import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/core/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthVisualSide } from "@/components/auth/AuthVisualSide";
import {
  validateEmail,
  validatePassword,
  formatAuthError,
} from "@/utils/authValidation";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field-level error messages
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  // General alert error
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Forgot password flow
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotErrorMessage, setForgotErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryFrom = new URLSearchParams(location.search).get("from");
  const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const fromLocation = queryFrom || stateFrom || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side field validations
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
      await login(email.trim(), password);
      navigate(fromLocation, { replace: true });
    } catch (err: unknown) {
      const formatted = formatAuthError(err, "Incorrect email or password.");
      setGeneralError(formatted);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage(null);
    setForgotSuccessMessage(null);

    const emailVal = validateEmail(forgotEmail);
    if (!emailVal.isValid) {
      setForgotErrorMessage(emailVal.message || "Enter a valid email address.");
      return;
    }

    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotSuccessMessage(
        "A reset link has been dispatched to your email address. Please check your inbox to reset your password."
      );
    } catch (err: unknown) {
      setForgotErrorMessage(formatAuthError(err, "Failed to send reset link. Please try again."));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Navigation Bar: Black + White + Orange Accent */}
      <AuthHeader currentView="login" />

      {/* Main Container: Split-screen desktop, focused mobile */}
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left: Clean, High-Contrast Black & White Form with Vibrant Orange Accent */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-14 lg:px-16 xl:px-24 bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Page Headings */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                {showForgot ? "Reset your password" : "Welcome Back"}
              </h1>
              <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                {showForgot
                  ? "Enter your email and we'll send you a reset link."
                  : "Sign in to continue your journey."}
              </p>
            </div>

            {/* General Alert for Authentication Failure */}
            {generalError && !showForgot && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in duration-200"
              >
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium">{generalError}</p>
              </div>
            )}

            {!showForgot ? (
              /* Normal Sign-In Form: Black + White + Vibrant Orange */
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5"
                  >
                    Email Address <span className="text-orange-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      required
                      autoComplete="email"
                      className={`h-12 text-sm pl-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 transition-all ${
                        fieldErrors.email
                          ? "border-red-500 focus-visible:ring-red-400"
                          : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                      }`}
                    />
                    <Mail className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password with Show/Hide Toggle & Forgot Password Link */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs sm:text-sm font-semibold text-zinc-800"
                    >
                      Password <span className="text-orange-500 font-bold">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(true);
                        setForgotEmail(email);
                        setGeneralError(null);
                        setForgotErrorMessage(null);
                        setForgotSuccessMessage(null);
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold transition-colors cursor-pointer"
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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      required
                      autoComplete="current-password"
                      className={`h-12 text-sm pl-10 pr-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 transition-all ${
                        fieldErrors.password
                          ? "border-red-500 focus-visible:ring-red-400"
                          : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                      }`}
                    />
                    <Lock className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Prominent Vibrant Orange Sign-In Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing In…
                      </span>
                    ) : (
                      <>
                        Sign In
                        <span className="text-lg">→</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* Forgot Password Form: Reset your password */
              <div className="space-y-5 animate-in fade-in duration-200">
                {forgotSuccessMessage ? (
                  <div
                    role="alert"
                    className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm space-y-4"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-emerald-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span>Reset Link Dispatched</span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-700 leading-relaxed">
                      {forgotSuccessMessage}
                    </p>
                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setShowForgot(false);
                          setForgotSuccessMessage(null);
                        }}
                        className="w-full h-12 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Back to log in
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRequestReset} className="space-y-5" noValidate>
                    {forgotErrorMessage && (
                      <div
                        role="alert"
                        className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5"
                      >
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <span>{forgotErrorMessage}</span>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="reset-email"
                        className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5"
                      >
                        Email <span className="text-orange-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="reset-email"
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            if (forgotErrorMessage) setForgotErrorMessage(null);
                          }}
                          className="h-12 text-sm pl-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-orange-500"
                        />
                        <Mail className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {forgotLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending…
                          </span>
                        ) : (
                          "Send reset link"
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowForgot(false);
                          setForgotErrorMessage(null);
                          setForgotSuccessMessage(null);
                        }}
                        className="w-full text-center text-sm font-semibold text-zinc-600 hover:text-zinc-900 py-2 transition-colors cursor-pointer block"
                      >
                        Back to log in
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Registration Link Below Form */}
            <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
              <p className="text-sm text-zinc-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Desktop Visual Side with Toyota Innova Airport Image & Editorial Lockup */}
        <AuthVisualSide />
      </div>
    </div>
  );
}
