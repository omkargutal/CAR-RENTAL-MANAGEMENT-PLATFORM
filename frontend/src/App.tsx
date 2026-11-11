import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HomePage } from "@/pages/HomePage";
import { ServicesPage } from "@/pages/ServicesPage";
import { CarsPage } from "@/pages/CarsPage";
import { CarDetailPage } from "@/pages/CarDetailPage";
import { AboutPage } from "@/pages/AboutPage";
import { ContactPage } from "@/pages/ContactPage";
import { SafetyGuidelinesPage } from "@/pages/SafetyGuidelinesPage";
import { CancellationPolicyPage } from "@/pages/CancellationPolicyPage";
import { TermsAndConditionsPage } from "@/pages/TermsAndConditionsPage";
import { LoginPage } from "@/pages/LoginPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { BookingsPage } from "@/pages/BookingsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";

// Pages that use full-bleed layouts (no standard public navbar/footer)
const FULLSCREEN_ROUTES = ["/login", "/register", "/admin", "/reset-password"];

function AppLayout() {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some((r) => location.pathname.startsWith(r));

  if (isFullscreen) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRoles={["ADMIN", "MANAGER", "STAFF"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/cars" element={<CarsPage />} />
        <Route path="/cars/:id" element={<CarDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Policy & Compliance Public Routes */}
        <Route path="/safety" element={<SafetyGuidelinesPage />} />
        <Route path="/cancellation-policy" element={<CancellationPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />

        {/* Protected Customer Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center pt-16 bg-slate-50">
              <div className="text-center">
                <div className="text-8xl font-black text-slate-200 mb-4">404</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
                <p className="text-slate-500 mb-6">The page you're looking for doesn't exist.</p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Back to Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
      <Footer />
      <WhatsAppFloatingButton />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
