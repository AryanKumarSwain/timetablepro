'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthSession } from './types';
import { loginUser } from './api-services';

interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('auth-session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Check if token is still valid
        if (new Date(parsed.expiresAt) > new Date()) {
          setSession(parsed);
        } else {
          localStorage.removeItem('auth-session');
        }
      } catch (err) {
        localStorage.removeItem('auth-session');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const newSession = await loginUser(email, password);
      if (!newSession) {
        throw new Error('Invalid email or password');
      }

      setSession(newSession);
      localStorage.setItem('auth-session', JSON.stringify(newSession));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setError(null);
    localStorage.removeItem('auth-session');
  }, []);

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    loading,
    error,
    login,
    logout,
    isAdmin: session?.user?.role === 'admin' ?? false,
    isTeacher: session?.user?.role === 'teacher' ?? false,
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

export function useRequireAuth(requiredRole?: 'admin' | 'teacher') {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && !auth.session) {
      // Would redirect to login in a real app
      window.location.href = '/login';
    }

    if (requiredRole && auth.session) {
      if (requiredRole === 'admin' && !auth.isAdmin) {
        window.location.href = '/unauthorized';
      }
      if (requiredRole === 'teacher' && !auth.isTeacher) {
        window.location.href = '/unauthorized';
      }
    }
  }, [auth.session, auth.loading, requiredRole, auth.isAdmin, auth.isTeacher]);

  return auth;
}
