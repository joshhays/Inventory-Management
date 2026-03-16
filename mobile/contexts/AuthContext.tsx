import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getApiBase } from '@/contexts/DeploymentContext';

type User = {
  id: number;
  email: string;
  name: string | null;
  isAdmin: boolean;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const fetchOptions = (init?: RequestInit): RequestInit => ({
  ...init,
  credentials: 'include' as RequestCredentials,
  headers: {
    'Content-Type': 'application/json',
    ...init?.headers,
  },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const base = getApiBase().replace(/\/$/, '');
      const res = await fetch(`${base}/api/auth/me`, fetchOptions());
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const base = getApiBase().replace(/\/$/, '');
    const res = await fetch(`${base}/api/auth/login`, fetchOptions({
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    }));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { message?: string }).message || 'Login failed');
    }
    setUser((data as { user: User }).user);
  }, []);

  const logout = useCallback(async () => {
    try {
      const base = getApiBase().replace(/\/$/, '');
      await fetch(`${base}/api/auth/logout`, fetchOptions({ method: 'POST' }));
    } catch {
      // ignore
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
