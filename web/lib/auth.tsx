"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, profileApi, type Vendor } from "./api";

interface AuthState {
  vendor: Vendor | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  register: (
    phone: string,
    pin: string,
    name: string,
    boothName?: string,
  ) => Promise<void>;
  logout: () => void;
  refreshVendor: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check localStorage for token and validate
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      profileApi
        .get()
        .then((v) => {
          setVendor(v);
        })
        .catch(() => {
          // Token invalid/expired
          localStorage.removeItem("token");
          setToken(null);
          setVendor(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (phone: string, pin: string) => {
    const res = await authApi.login(phone, pin);
    localStorage.setItem("token", res.token);
    setToken(res.token);
    setVendor(res.vendor);
  }, []);

  const register = useCallback(
    async (phone: string, pin: string, name: string, boothName?: string) => {
      const res = await authApi.register(phone, pin, name, boothName);
      localStorage.setItem("token", res.token);
      setToken(res.token);
      setVendor(res.vendor);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setVendor(null);
  }, []);

  const refreshVendor = useCallback(async () => {
    try {
      const v = await profileApi.get();
      setVendor(v);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        vendor,
        token,
        isAuthenticated: !!token && !!vendor,
        isLoading,
        login,
        register,
        logout,
        refreshVendor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
