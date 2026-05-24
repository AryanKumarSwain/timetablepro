import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { getSession, type SessionUser } from '@/lib/session';

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    throw new AuthError('Unauthorized', 401);
  }
  return session.user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new AuthError('Forbidden', 403);
  }
  return user;
}

export async function requireSchoolAdmin(): Promise<SessionUser & { schoolId: string }> {
  const user = await requireRole('ADMIN');
  if (!user.schoolId) {
    throw new AuthError('School context required', 403);
  }
  return { ...user, schoolId: user.schoolId };
}

export async function requireSchoolContext(): Promise<{
  user: SessionUser;
  schoolId: string;
}> {
  const user = await requireSession();
  if (user.role === 'SUPER_ADMIN' || !user.schoolId) {
    throw new AuthError('School context required', 403);
  }
  return { user, schoolId: user.schoolId };
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  return requireRole('SUPER_ADMIN');
}

export function schoolWhere(schoolId: string) {
  return { schoolId };
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
