import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera, Save, User as UserIcon, Lock,
  CheckCircle2, AlertCircle, ShieldCheck,
  Mail, Phone, FileText, ArrowRight, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/core/api";

const TABS = [
  { id: "personal", label: "Personal Information", Icon: UserIcon, desc: "Name, contact & identity" },
  { id: "security", label: "Security & Password", Icon: Lock, desc: "Password & authentication" },
];

export function ProfilePage() {
  const { user, updateProfile, updateDocuments, uploadAvatar } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhar, setAadhar] = useState("");

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone_number || "");
      const docs = (user.documents || {}) as Record<string, string>;
      setAadhar(docs.aadhar_number || "");
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ type: "error", text: "Please select an image file (PNG, JPG, WebP)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ type: "error", text: "Image size must be less than 5MB." });
      return;
    }

    setAvatarUploading(true);
    setAvatarMsg(null);

    try {
      if (uploadAvatar) {
        await uploadAvatar(file);
      }
      setAvatarMsg({ type: "success", text: "Profile photo updated!" });
    } catch {
      // Graceful fallback to client-side data URL storage via updateDocuments
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            await updateDocuments({ avatar_url: dataUrl, aadhar_number: aadhar });
            setAvatarMsg({ type: "success", text: "Profile photo updated!" });
          }
        };
        reader.readAsDataURL(file);
      } catch {
        setAvatarMsg({ type: "error", text: "Failed to upload photo. Please try again." });
      }
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setAvatarMsg(null), 3500);
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await updateProfile({
        full_name: fullName,
        phone_number: phone,
      });
      await updateDocuments({
        aadhar_number: aadhar,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (newPassword.length < 8) {
      setPwStatus("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwStatus("New passwords do not match.");
      return;
    }

    setPwLoading(true);
    try {
      await apiRequest("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      setPwStatus("Password successfully changed!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwStatus(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  };

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const docs = (user?.documents || {}) as Record<string, string>;
  const avatarUrl = docs.avatar_url;

  return (
    <div className="min-h-screen bg-slate-50 pt-16 lg:pt-[72px] pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1336px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                MY ACCOUNT
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Profile & Account Settings
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
              Manage your personal identity, contact details, identity verification, and security credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[1336px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: User Identity Card & Tabs Navigation */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* User Identity Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 text-center shadow-sm">
              <div className="relative inline-block mb-3.5 group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-500/25 mx-auto overflow-hidden cursor-pointer relative group-hover:ring-4 group-hover:ring-orange-200 transition-all block focus:outline-none focus:ring-4 focus:ring-orange-400"
                  title="Click to update profile photo"
                  aria-label="Click to update profile photo"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.full_name || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold text-white">
                    <Camera className="h-4 w-4 mb-0.5" />
                    <span>Change</span>
                  </div>
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  aria-label="Upload profile photo"
                  title="Upload profile photo"
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-orange-600 border-2 border-white flex items-center justify-center text-white hover:bg-orange-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              {avatarMsg && (
                <p
                  className={`text-xs font-semibold mb-2 ${
                    avatarMsg.type === "success" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {avatarMsg.text}
                </p>
              )}

              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {user?.full_name || "Traveler"}
              </h2>
              <p className="text-xs text-slate-500 break-all mt-0.5 mb-3 font-medium">
                {user?.email}
              </p>

              <div className="flex items-center justify-center gap-2 flex-wrap mb-3.5">
                <Badge
                  variant={user?.role === "ADMIN" ? "gold" : "outline"}
                  className="text-[11px] font-bold uppercase tracking-wider"
                >
                  {user?.role || "CUSTOMER"}
                </Badge>
                {user?.is_verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    Active Account
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Member since{" "}
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "2026"}
                </span>
              </div>
            </div>

            {/* Sidebar Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-sm space-y-1">
              {TABS.map(({ id, label, Icon, desc }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-white/10 text-orange-400"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold tracking-tight leading-snug">{label}</p>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? "text-slate-400" : "text-slate-400"
                        }`}
                      >
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Navigation Links */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-sm space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 block">
                Quick Shortcuts
              </span>
              <Link
                to="/bookings"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 hover:bg-slate-50 transition-colors"
              >
                <span>My Bookings & Rides</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 hover:bg-slate-50 transition-colors"
              >
                <span>Customer Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Right Column: Tab Content */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              {activeTab === "personal" && (
                <form onSubmit={handleSavePersonal} className="p-6 sm:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Personal Information
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Update your contact details and identity information used for your journeys.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your legal full name"
                          className="pl-10 h-11 rounded-xl bg-white border-slate-200 text-sm focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="pl-10 h-11 rounded-xl bg-white border-slate-200 text-sm focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed text-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      Email address is your primary account identifier and cannot be changed directly.
                    </p>
                  </div>

                  {/* Document Verification Box */}
                  <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-orange-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Document Verification: Aadhaar Details
                        </h3>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full w-fit">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Provide your 12-digit Aadhaar number for seamless passenger verification and outstation intercity toll compliance.
                    </p>
                    <div>
                      <Input
                        value={aadhar}
                        onChange={(e) => setAadhar(e.target.value)}
                        placeholder="e.g. 12-digit Aadhaar Number (XXXX-XXXX-XXXX)"
                        maxLength={16}
                        className="h-11 rounded-xl bg-white border-slate-200 text-sm focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 gap-2 h-11 px-6 text-sm"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving Changes..." : "Save Changes"}
                    </Button>

                    {saved && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Profile updated successfully!
                      </span>
                    )}
                  </div>
                </form>
              )}

              {activeTab === "security" && (
                <form onSubmit={handleChangePassword} className="p-6 sm:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Security & Password
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Update your account password and safeguard your login credentials.
                    </p>
                  </div>

                  {pwStatus && (
                    <div
                      className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                        pwStatus.includes("success")
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {pwStatus.includes("success") ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>{pwStatus}</span>
                    </div>
                  )}

                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter your current password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="h-11 rounded-xl bg-white border-slate-200 text-sm focus:border-orange-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          New Password <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="password"
                          placeholder="Min 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-11 rounded-xl bg-white border-slate-200 text-sm focus:border-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          Confirm New Password <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="password"
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-11 rounded-xl bg-white border-slate-200 text-sm focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
                      <p className="font-bold text-slate-800">Password Requirements:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                        <li>Must be at least 8 characters long</li>
                        <li>Must match in both new password fields</li>
                      </ul>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={pwLoading}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 gap-2 h-11 px-6 text-sm"
                      >
                        <Lock className="h-4 w-4" />
                        {pwLoading ? "Updating Password..." : "Update Password"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
