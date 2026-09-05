import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import type { UserRole } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  onboardingDone?: boolean;
  name?: string | null;
  phone?: string | null;
  countryCode?: string | null;
}

export interface AppSessionData {
  user?: SessionUser;
  isLoggedIn: boolean;
}

/** iron-session requires a password of at least 32 characters. */
export function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  return 'default-school-tms-session-secret-min-32-chars-key!!';
}

export const sessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: 'school_tms_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<AppSessionData>(cookieStore, sessionOptions);
}

export function getRoleRedirectPath(role: UserRole, onboardingDone = true): string {
  if (role === 'ADMIN' && !onboardingDone) {
    return '/signup';
  }
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'TEACHER':
      return '/teacher/schedule';
    default:
      return '/login';
  }
}
