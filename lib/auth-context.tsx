'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { User, AuthSession, UserRole } from './types';
import { loginUser, fetchCurrentUser, logoutUser } from './api-services';

interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role?: string) => Promise<string>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (user) setSession({ user });
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, role?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await loginUser(email, password, role);
      setSession({ user: result.user });
      return result.redirectTo;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setSession(null);
    setError(null);
  }, []);

  const role = session?.user?.role;

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    loading,
    error,
    login,
    logout,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    isSuperAdmin: role === 'super-admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth(requiredRole?: UserRole | 'admin' | 'teacher', skip = false) {
  const auth = useAuth();

  useEffect(() => {
    if (skip) {
      return;
    }

    if (!auth.loading && !auth.session) {
      window.location.href = '/login';
      return;
    }

    if (requiredRole && auth.session) {
      const normalized =
        requiredRole === 'admin'
          ? 'admin'
          : requiredRole === 'teacher'
            ? 'teacher'
            : requiredRole;

      if (normalized === 'admin' && !auth.isAdmin) {
        window.location.href = '/unauthorized';
      }
      if (normalized === 'teacher' && !auth.isTeacher) {
        window.location.href = '/unauthorized';
      }
      if (normalized === 'super-admin' && !auth.isSuperAdmin) {
        window.location.href = '/unauthorized';
      }
    }
  }, [
    auth.session,
    auth.loading,
    requiredRole,
    auth.isAdmin,
    auth.isTeacher,
    auth.isSuperAdmin,
    skip,
  ]);

  return auth;
}
