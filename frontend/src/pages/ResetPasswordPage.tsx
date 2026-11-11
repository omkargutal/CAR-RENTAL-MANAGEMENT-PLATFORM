import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/core/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthVisualSide } from "@/components/auth/AuthVisualSide";
import { validatePassword, formatAuthError } from "@/utils/authValidation";

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const queryToken = new URLSearchParams(location.search).get("token") || "";

  const [token] = useState(queryToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token) {
      setErrorMsg("Missing or invalid password reset token. Please request a new link.");
      return;
    }

    const pwValidation = validatePassword(newPassword, true);
    if (!pwValidation.isValid) {
      setErrorMsg(pwValidation.message || "Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        token: token.trim(),
        new_password: newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    } catch (err: unknown) {
      setErrorMsg(formatAuthError(err, "Invalid or expired reset token. Please request a new link."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <AuthHeader currentView="login" />

      {/* Main Container */}
      <div className="flex-1 grid lg:grid-cols-2">
        <div className="flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-14 lg:px-16 xl:px-24 bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Page Headings */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                Create New Password
              </h1>
              <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                Enter your new password below to regain access to your account.
              </p>
            </div>

            {/* Success Notification */}
            {success ? (
              <div
                role="alert"
                className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm space-y-3 animate-in fade-in"
              >
                <div className="flex items-center gap-2.5 font-bold text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>Password Reset Successfully!</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-700 leading-relaxed">
                  Your new password is now active. Redirecting you to sign in…
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                  >
                    Go to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Missing Token Warning */}
                {!token && (
                  <div
                    role="alert"
                    className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Missing Reset Token</p>
                      <p className="mt-0.5">Please check your email and click the exact link sent to you.</p>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div
                    role="alert"
                    className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5"
                  >
                    New Password <span className="text-orange-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      required
                      className="h-12 text-sm pl-10 pr-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-orange-500"
                    />
                    <Lock className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Must be at least 8 characters long</p>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5"
                  >
                    Confirm New Password <span className="text-orange-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="reset-confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      required
                      className="h-12 text-sm pl-10 pr-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-orange-500"
                    />
                    <Lock className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? "Updating Password…" : "Reset Password"}
                  </Button>

                  <Link
                    to="/login"
                    className="w-full text-center text-sm font-semibold text-zinc-600 hover:text-zinc-900 py-2 transition-colors cursor-pointer block"
                  >
                    Back to log in
                  </Link>
                </div>
              </form>
            )}

            {/* Help text */}
            <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
              <p className="text-sm text-zinc-600">
                Need help?{" "}
                <Link
                  to="/contact"
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                >
                  Contact Support
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Visual Side */}
        <AuthVisualSide />
      </div>
    </div>
  );
}
