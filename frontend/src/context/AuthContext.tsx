import React, { createContext, useContext, useEffect, useState } from "react";
import {
  authApi,
  clearStoredAccessToken,
  getStoredAccessToken,
  User,
} from "@/core/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone_number?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { full_name?: string; phone_number?: string }) => Promise<void>;
  updateDocuments: (data: {
    driver_license_number?: string;
    driver_license_state?: string;
    driver_license_country?: string;
    driver_license_expiry?: string;
    aadhar_number?: string;
    avatar_url?: string;
    document_urls?: string[];
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    async function initAuth() {
      const token = getStoredAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authApi.getMe();
        setUser(currentUser);
      } catch (err) {
        // Token might be expired, attempt transparent refresh via cookie
        try {
          const refreshed = await authApi.refresh();
          setUser(refreshed.user);
        } catch {
          clearStoredAccessToken();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login({ email, password });
    setUser(res.user);
    return res.user;
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    phone_number?: string;
  }): Promise<User> => {
    const res = await authApi.register(data);
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const u = await authApi.getMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  const updateProfile = async (data: { full_name?: string; phone_number?: string }) => {
    const updated = await authApi.updateProfile(data);
    setUser(updated);
  };

  const updateDocuments = async (data: {
    driver_license_number?: string;
    driver_license_state?: string;
    driver_license_country?: string;
    driver_license_expiry?: string;
    aadhar_number?: string;
    avatar_url?: string;
    document_urls?: string[];
  }) => {
    const updated = await authApi.updateDocuments(data);
    setUser(updated);
  };

  const uploadAvatar = async (file: File): Promise<User> => {
    const updated = await authApi.uploadAvatar(file);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        updateDocuments,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
