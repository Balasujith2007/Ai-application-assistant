'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  getDashboardRoute,
} from '@/lib/auth';
import { User, AuthResponse } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: string,
    department?: string,
    employeeId?: string
  ) => Promise<void>;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        setUser(storedUser);
        // Optionally verify token against /auth/me
        try {
          const res = await api.get<{ data: User }>('/auth/me');
          const freshUser = res.data.data;
          setUser(freshUser);
          setStoredUser(freshUser);
        } catch {
          removeToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ data: AuthResponse }>('/auth/login', {
        email,
        password,
      });
      const { user: loggedInUser, token } = res.data.data;
      setToken(token);
      setStoredUser(loggedInUser);
      setUser(loggedInUser);
      router.push(getDashboardRoute(loggedInUser.role));
    },
    [router],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, role?: string, department?: string, employeeId?: string) => {
      const res = await api.post<{ data: AuthResponse }>('/auth/register', {
        name,
        email,
        password,
        role,
        department,
        employeeId,
      });
      const { user: newUser, token } = res.data.data;
      setToken(token);
      setStoredUser(newUser);
      setUser(newUser);
      router.push(getDashboardRoute(newUser.role));
    },
    [router],
  );

  const loginWithToken = useCallback((token: string, loggedInUser: User) => {
    setToken(token);
    setStoredUser(loggedInUser);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ data: User }>('/auth/me');
      const freshUser = res.data.data;
      setUser(freshUser);
      setStoredUser(freshUser);
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithToken,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
