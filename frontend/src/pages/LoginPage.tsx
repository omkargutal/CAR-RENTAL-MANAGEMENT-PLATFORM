import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Lock, Mail, Plane, MapPin, Car, CarFront } from "lucide-react";
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
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
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
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setForgotSuccessMessage("Password reset instructions have been dispatched to your email address.");
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      setForgotStep("reset");
    } catch (err: unknown) {
      setForgotErrorMessage(formatAuthError(err, "Failed to request password reset."));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage(null);
    setForgotSuccessMessage(null);

    const pwVal = validatePassword(newPassword, true);
    if (!pwVal.isValid) {
      setForgotErrorMessage(pwVal.message || "Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotErrorMessage("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      await authApi.resetPassword({
        token: resetToken.trim(),
        new_password: newPassword,
      });
      setForgotSuccessMessage("Password has been reset successfully! Redirecting to sign in…");
      setEmail(forgotEmail.trim());
      setTimeout(() => {
        setShowForgot(false);
        setForgotStep("request");
        setForgotSuccessMessage(null);
      }, 2000);
    } catch (err: unknown) {
      setForgotErrorMessage(formatAuthError(err, "Invalid or expired reset session."));
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
            {/* Mobile Header Banner */}
            <div className="lg:hidden mb-6 pb-4 border-b border-zinc-100 text-center">
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500">
                YOUR TRUSTED DAILY COMMUTE PARTNER
              </p>
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-950 mt-0.5">
                PUNE &amp; <span className="text-orange-500">MUMBAI</span>
              </h2>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-zinc-600 mt-2.5 uppercase flex-wrap">
                <span className="inline-flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-full">
                  <Plane className="h-3 w-3 text-orange-500" /> Airport Transfer
                </span>
                <span className="inline-flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-full">
                  <MapPin className="h-3 w-3 text-orange-500" /> Outstation
                </span>
                <span className="inline-flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-full">
                  <Car className="h-3 w-3 text-orange-500" /> One-Way
                </span>
                <span className="inline-flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-full">
                  <CarFront className="h-3 w-3 text-orange-500" /> Local Taxi
                </span>
              </div>
            </div>

            {/* Page Headings */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                {showForgot
                  ? forgotStep === "reset"
                    ? "Create New Password"
                    : "Reset Password"
                  : "Welcome Back"}
              </h1>
              <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                {showForgot
                  ? forgotStep === "reset"
                    ? "Enter your new password below to regain access."
                    : "Enter your registered email address and we'll help you reset your password."
                  : "Sign in to continue your journey."}
              </p>
            </div>

            {/* General Alert for Authentication Failure */}
            {generalError && (
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
                        setForgotStep("request");
                        setForgotEmail(email);
                        setGeneralError(null);
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold transition-colors"
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
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
                    className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
                  >
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
                </div>
              </form>
            ) : (
              /* Forgot Password Flow: Clean customer-facing steps (No raw tokens shown!) */
              <div className="space-y-5">
                {forgotSuccessMessage && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{forgotSuccessMessage}</span>
                  </div>
                )}

                {forgotErrorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <span>{forgotErrorMessage}</span>
                  </div>
                )}

                {forgotStep === "request" ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                        Registered Email Address <span className="text-orange-500 font-bold">*</span>
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-12 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-orange-500"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForgot(false)}
                        className="flex-1 h-12 rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      >
                        Back to Login
                      </Button>
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20"
                      >
                        {forgotLoading ? "Sending…" : "Send Reset Link"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                        New Password <span className="text-orange-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={showNewPw ? "text" : "password"}
                          required
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-12 rounded-xl pr-10 bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                        >
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">Must be at least 8 characters long</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                        Confirm New Password <span className="text-orange-500 font-bold">*</span>
                      </label>
                      <Input
                        type="password"
                        required
                        placeholder="Repeat your new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="h-12 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-orange-500"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForgot(false);
                          setForgotStep("request");
                        }}
                        className="flex-1 h-12 rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20"
                      >
                        {forgotLoading ? "Saving…" : "Save New Password"}
                      </Button>
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
