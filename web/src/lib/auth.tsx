'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  address?: string;
  default_booth_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Fetch fresh profile when token changes
  useEffect(() => {
    if (token) {
      userApi.getProfile(token)
        .then((data) => {
          const u = data as User;
          setUser(u);
          localStorage.setItem('auth_user', JSON.stringify(u));
        })
        .catch(() => {
          // Token might be expired
          logout();
        });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const u = res.user as User;
    setToken(res.token);
    setUser(u);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role?: string) => {
    const res = await authApi.register({ email, password, name, role });
    const u = res.user as User;
    setToken(res.token);
    setUser(u);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  const updateProfile = useCallback(async (data: Record<string, unknown>) => {
    if (!token) return;
    const updated = await userApi.updateProfile(data, token);
    const u = updated as User;
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
