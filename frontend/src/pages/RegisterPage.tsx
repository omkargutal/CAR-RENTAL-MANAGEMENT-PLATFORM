import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, AlertCircle, User as UserIcon, Mail, Phone, Lock, Plane, MapPin, Car, CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthVisualSide } from "@/components/auth/AuthVisualSide";
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhoneNumber,
  validatePasswordMatch,
  formatAuthError,
} from "@/utils/authValidation";

export function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field-level error messages
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // General alert error
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleFieldChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneralError(null);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // 1. Client-side field validations
    const errors: typeof fieldErrors = {};

    const fnVal = validateName(form.firstName, "first name");
    if (!fnVal.isValid) errors.firstName = fnVal.message;

    const lnVal = validateName(form.lastName, "last name");
    if (!lnVal.isValid) errors.lastName = lnVal.message;

    const emailVal = validateEmail(form.email);
    if (!emailVal.isValid) errors.email = emailVal.message;

    const phoneVal = validatePhoneNumber(form.phone);
    if (!phoneVal.isValid) errors.phone = phoneVal.message;

    const pwVal = validatePassword(form.password, true);
    if (!pwVal.isValid) errors.password = pwVal.message;

    const matchVal = validatePasswordMatch(form.password, form.confirmPassword);
    if (!matchVal.isValid) errors.confirmPassword = matchVal.message;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // 2. Submit account creation
    setLoading(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        phone_number: form.phone.trim() || undefined,
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const formatted = formatAuthError(err, "Unable to complete registration. Please try again.");
      setGeneralError(formatted);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Mobile/Tablet Navigation Bar */}
      <AuthHeader currentView="register" />

      {/* Main Container: Split-screen desktop, focused mobile */}
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left on Desktop / Bottom on Mobile: Desktop Visual Side with Toyota Innova Airport Image */}
        <div className="order-2 lg:order-1">
          <AuthVisualSide />
        </div>

        {/* Right on Desktop / Top on Mobile: Form View in Clean White Panel */}
        <div className="order-1 lg:order-2 flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-14 lg:px-16 xl:px-24 bg-white">
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

            {/* Page Heading & Welcome Message */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                Create an Account
              </h1>
              <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                We're glad you're here! Join us for a seamless cab booking experience.
              </p>
            </div>

            {/* General Error Alert */}
            {generalError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in duration-200"
              >
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium">{generalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              {/* Name fields row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="reg-first-name" className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                    First Name <span className="text-orange-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="reg-first-name"
                      placeholder="e.g. Rahul"
                      value={form.firstName}
                      onChange={handleFieldChange("firstName")}
                      required
                      autoComplete="given-name"
                      className={`h-12 text-sm pl-9 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 ${
                        fieldErrors.firstName ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                      }`}
                    />
                    <UserIcon className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {fieldErrors.firstName && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-last-name" className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                    Last Name <span className="text-orange-500 font-bold">*</span>
                  </label>
                  <Input
                    id="reg-last-name"
                    placeholder="e.g. Sharma"
                    value={form.lastName}
                    onChange={handleFieldChange("lastName")}
                    required
                    autoComplete="family-name"
                    className={`h-12 text-sm rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 ${
                      fieldErrors.lastName ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                    }`}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="reg-email" className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                  Email Address <span className="text-orange-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleFieldChange("email")}
                    required
                    autoComplete="email"
                    className={`h-12 text-sm pl-9 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 ${
                      fieldErrors.email ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                    }`}
                  />
                  <Mail className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Phone Number (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="reg-phone" className="text-xs sm:text-sm font-semibold text-zinc-800">
                    Phone Number
                  </label>
                  <span className="text-[11px] text-zinc-400 font-medium">Optional</span>
                </div>
                <div className="relative">
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleFieldChange("phone")}
                    autoComplete="tel"
                    className={`h-12 text-sm pl-9 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 ${
                      fieldErrors.phone ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                    }`}
                  />
                  <Phone className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {fieldErrors.phone && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                  Password <span className="text-orange-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPw ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={handleFieldChange("password")}
                    required
                    autoComplete="new-password"
                    className={`h-12 text-sm pl-9 pr-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 ${
                      fieldErrors.password ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                    }`}
                  />
                  <Lock className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 focus:outline-none"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.password}</p>
                ) : (
                  <p className="text-[11px] text-zinc-400 mt-1">Must be at least 8 characters long</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm-password" className="block text-xs sm:text-sm font-semibold text-zinc-800 mb-1.5">
                  Confirm Password <span className="text-orange-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="reg-confirm-password"
                    type={showConfirmPw ? "text" : "password"}
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={handleFieldChange("confirmPassword")}
                    required
                    autoComplete="new-password"
                    className={`h-12 text-sm pl-9 pr-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 ${
                      fieldErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:border-orange-500 focus-visible:ring-orange-500"
                    }`}
                  />
                  <Lock className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    aria-label={showConfirmPw ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 focus:outline-none"
                  >
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Prominent Vibrant Orange Create Account Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Account…
                    </span>
                  ) : (
                    <>
                      Create Account <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Link to Sign In */}
            <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
              <p className="text-sm text-zinc-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
