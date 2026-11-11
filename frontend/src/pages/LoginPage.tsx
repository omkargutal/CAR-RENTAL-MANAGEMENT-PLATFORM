import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Lock, Mail, KeyRound, Plane, MapPin, Car, CarFront } from "lucide-react";
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
      setForgotSuccessMessage(res.message);
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

    if (!resetToken.trim()) {
      setForgotErrorMessage("Please enter the reset token.");
      return;
    }

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
      setForgotSuccessMessage("Password has been reset successfully. Please sign in with your new password.");
      setEmail(forgotEmail.trim());
      setTimeout(() => {
        setShowForgot(false);
        setForgotStep("request");
        setForgotSuccessMessage(null);
      }, 2000);
    } catch (err: unknown) {
      setForgotErrorMessage(formatAuthError(err, "Invalid or expired reset token."));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white relative overflow-hidden">
      {/* Background with Ambient Glows matching Home Section */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
        style={{ backgroundImage: "url('/assets/auth/airport-innova-auth.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950 pointer-events-none" />
      <div className="hero-glow w-96 h-96 bg-blue-600 -top-20 -left-20 opacity-20 pointer-events-none absolute" />
      <div className="hero-glow w-80 h-80 bg-amber-500 bottom-10 left-1/3 opacity-15 pointer-events-none absolute" />

      {/* Top Mobile/Tablet Navigation Bar */}
      <AuthHeader currentView="login" />

      {/* Main Container: Split-screen desktop, focused mobile */}
      <div className="flex-1 grid lg:grid-cols-2 relative z-10">
        {/* Left: Form View in Frosted Glassmorphic Card */}
        <div className="flex flex-col justify-center items-center px-4 py-8 sm:px-8 sm:py-12 lg:px-14 xl:px-20">
          <div className="max-w-md w-full mx-auto bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl">
            {/* Mobile Banner: "Your Trusted Daily Commute Partner in Pune & Mumbai" */}
            <div className="lg:hidden mb-6 pb-4 border-b border-white/10 text-center">
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-300 block drop-shadow">
                Your Trusted Daily Commute Partner
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight text-amber-400 mt-0.5 drop-shadow">
                In Pune & Mumbai
              </h2>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-white/90 mt-2.5 uppercase flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Plane className="h-3 w-3 text-amber-400" /> Airport Transfer
                </span>
                <span className="text-white/30">•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-amber-400" /> Outstation
                </span>
                <span className="text-white/30">•</span>
                <span className="inline-flex items-center gap-1">
                  <Car className="h-3 w-3 text-amber-400" /> One Way
                </span>
                <span className="text-white/30">•</span>
                <span className="inline-flex items-center gap-1">
                  <CarFront className="h-3 w-3 text-amber-400" /> Local Taxi
                </span>
              </div>
            </div>

            {/* Page Headings */}
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {showForgot ? "Reset Password" : "Welcome Back"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {showForgot
                  ? "Follow the steps below to securely recover your account."
                  : "Sign in to continue your journey."}
              </p>
            </div>

            {/* General Alert for Authentication Failure */}
            {generalError && (
              <div
                role="alert"
                className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 flex items-start gap-3 text-sm animate-in fade-in duration-200"
              >
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium">{generalError}</p>
              </div>
            )}

            {!showForgot ? (
              /* Normal Sign-In Form */
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1"
                  >
                    Email Address <span className="text-amber-400">*</span>
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
                      className={`h-11 sm:h-12 text-sm pl-10 rounded-xl bg-slate-950/60 text-white placeholder:text-slate-500 transition-all ${
                        fieldErrors.email
                          ? "border-red-500 focus-visible:ring-red-400"
                          : "border-slate-700/80 focus-visible:ring-amber-500"
                      }`}
                    />
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password with Show/Hide Toggle & Forgot Password Link */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="login-password"
                      className="block text-xs sm:text-sm font-semibold text-slate-200"
                    >
                      Password <span className="text-amber-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(true);
                        setForgotStep("request");
                        setForgotEmail(email);
                        setGeneralError(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
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
                      className={`h-11 sm:h-12 text-sm pl-10 pr-10 rounded-xl bg-slate-950/60 text-white placeholder:text-slate-500 transition-all ${
                        fieldErrors.password
                          ? "border-red-500 focus-visible:ring-red-400"
                          : "border-slate-700/80 focus-visible:ring-amber-500"
                      }`}
                    />
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Prominent Orange Sign-In Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 sm:h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
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
              /* Forgot Password Flow */
              <div className="space-y-4">
                {forgotSuccessMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{forgotSuccessMessage}</span>
                  </div>
                )}

                {forgotErrorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <span>{forgotErrorMessage}</span>
                  </div>
                )}

                {forgotStep === "request" ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1">
                        Registered Email Address <span className="text-amber-400">*</span>
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-11 sm:h-12 rounded-xl bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForgot(false)}
                        className="flex-1 h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Back to Login
                      </Button>
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl"
                      >
                        {forgotLoading ? "Sending…" : "Send Reset Link"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-3.5">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1">
                        Reset Token / Verification Code <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          required
                          placeholder="Paste reset token here"
                          value={resetToken}
                          onChange={(e) => setResetToken(e.target.value)}
                          className="h-11 rounded-xl font-mono text-xs pl-9 bg-slate-950/60 border-slate-700 text-white"
                        />
                        <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1">
                        New Password (Min 8 characters) <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={showNewPw ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-11 rounded-xl pr-10 bg-slate-950/60 border-slate-700 text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1">
                        Confirm New Password <span className="text-amber-400">*</span>
                      </label>
                      <Input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="h-11 rounded-xl bg-slate-950/60 border-slate-700 text-white"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForgot(false);
                          setForgotStep("request");
                        }}
                        className="flex-1 h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl"
                      >
                        {forgotLoading ? "Resetting…" : "Reset Password"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Registration Link Below Form */}
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-sm text-slate-400">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-bold text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Desktop Visual Side with Toyota Innova Airport Image & Commute Partner Banner */}
        <AuthVisualSide />
      </div>
    </div>
  );
}
