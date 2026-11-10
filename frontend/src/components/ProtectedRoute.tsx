import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = (user.role || "").toUpperCase();
    const hasRole = requiredRoles.map((r) => r.toUpperCase()).includes(userRole);

    if (!hasRole) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
            <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-5">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-slate-400 text-sm mb-6">
              You do not have the required administrative permissions to access this area.
              Current role: <span className="text-blue-400 font-semibold">{user.role}</span>.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline-dark" onClick={() => window.history.back()}>
                Go Back
              </Button>
              <Button onClick={() => (window.location.href = "/dashboard")}>
                My Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
