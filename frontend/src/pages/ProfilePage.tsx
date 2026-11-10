import { useEffect, useState } from "react";
import { Camera, Save, User as UserIcon, Lock, Bell, CreditCard, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/core/api";

const TABS = [
  { id: "personal", label: "Personal Info", Icon: UserIcon },
  { id: "security", label: "Security", Icon: Lock },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "payment", label: "Payment", Icon: CreditCard },
];

export function ProfilePage() {
  const { user, updateProfile, updateDocuments } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");

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
      setLicense(docs.driver_license_number || "");
      setLicenseState(docs.driver_license_state || "");
      setLicenseExpiry(docs.driver_license_expiry || "");
    }
  }, [user]);

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
        driver_license_number: license,
        driver_license_state: licenseState,
        driver_license_expiry: licenseExpiry,
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

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-extrabold text-slate-900">My Profile</h1>
          <p className="text-slate-500 mt-1">Manage your verified customer account, documents, and credentials</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Avatar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-sm">
              <div className="relative inline-block mb-3">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/30 mx-auto">
                  {initials}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="font-bold text-slate-900">{user?.full_name || "Guest"}</p>
              <p className="text-xs text-slate-500 mb-2">{user?.email}</p>
              <div className="flex justify-center gap-1.5 flex-wrap">
                <Badge variant={user?.role === "ADMIN" ? "gold" : "default"}>
                  {user?.role || "CUSTOMER"}
                </Badge>
                <Badge variant={user?.is_verified ? "success" : "secondary"}>
                  {user?.is_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "2026"}
              </div>
            </div>

            {/* Sidebar Tabs */}
            <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-sm">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              {activeTab === "personal" && (
                <form onSubmit={handleSavePersonal} className="p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Personal Information</h2>
                    <p className="text-sm text-slate-500">Update your personal identity and driver credentials</p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <Input type="email" value={user?.email || ""} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                    <p className="text-[11px] text-slate-400 mt-1">Email address is your primary account identifier and cannot be altered directly.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 8421081570" />
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Driving License & Documents</h3>
                    <p className="text-xs text-slate-500 mb-3">Required for automated instant vehicle pickup.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">License Number</label>
                        <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="e.g. CA-1234567" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Issuing State / Region</label>
                        <Input value={licenseState} onChange={(e) => setLicenseState(e.target.value)} placeholder="e.g. California" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration Date</label>
                        <Input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <Button type="submit" className="gap-2" disabled={saving}>
                      <Save className="h-4 w-4" />
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                    {saved && (
                      <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Profile updated successfully
                      </p>
                    )}
                  </div>
                </form>
              )}

              {activeTab === "security" && (
                <form onSubmit={handleChangePassword} className="p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Security & Authentication</h2>
                    <p className="text-sm text-slate-500">Update your Argon2-secured password</p>
                  </div>

                  {pwStatus && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      pwStatus.includes("success") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {pwStatus.includes("success") ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                      <span>{pwStatus}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password (min 8 characters)</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="gap-2" disabled={pwLoading}>
                      <Lock className="h-4 w-4" /> {pwLoading ? "Updating…" : "Update Password"}
                    </Button>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">Session Security</p>
                          <p className="text-xs text-slate-500">Your session is protected by rotating refresh tokens and rate-limit guardrails.</p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  </div>
                </form>
              )}

              {activeTab === "notifications" && (
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Notification Preferences</h2>
                    <p className="text-sm text-slate-500">Choose how you want to be notified</p>
                  </div>
                  {[
                    { label: "Booking Confirmations", desc: "Receive confirmation when a booking is made", enabled: true },
                    { label: "Booking Reminders", desc: "Reminders 24h before pickup", enabled: true },
                    { label: "Promotional Offers", desc: "Deals, discounts, and special offers", enabled: false },
                    { label: "Account Updates", desc: "Security alerts and account changes", enabled: true },
                  ].map(({ label, desc, enabled }) => (
                    <div key={label} className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                        <input type="checkbox" defaultChecked={enabled} className="sr-only peer" />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "payment" && (
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Payment Methods</h2>
                    <p className="text-sm text-slate-500">Manage your saved cards and billing info</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="h-10 w-14 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold shadow">
                      VISA
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">•••• •••• •••• 4242</p>
                      <p className="text-xs text-slate-500">Expires 09/27</p>
                    </div>
                    <Badge variant="success" className="ml-auto">Default</Badge>
                  </div>
                  <Button variant="outline" className="gap-2 w-full">
                    <CreditCard className="h-4 w-4" /> Add New Card
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
