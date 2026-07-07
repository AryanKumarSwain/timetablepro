import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { getSession, type SessionUser } from '@/lib/session';
import { prisma } from './prisma';

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

  if (!session.user.id && session.user.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });

    if (dbUser) {
      session.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        schoolId: dbUser.schoolId,
        onboardingDone: dbUser.onboardingDone,
      };
      await session.save();
    }
  }

  if (!session.user.id) {
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

export async function requireSchoolContextOptional(): Promise<{
  user: SessionUser;
  schoolId: string | null;
}> {
  const user = await requireSession();
  return { user, schoolId: user.schoolId || null };
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

export async function checkFeatureAccess(feature: 'reports' | 'attendance' | 'homework' | 'lesson-planning'): Promise<boolean> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user || !session.user.schoolId) return false;

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    include: { plan: true },
  });

  if (!school || !school.plan) return false;

  const plan = school.plan as any;
  switch (feature) {
    case 'reports':
      return plan.reportEnabled || false;
    case 'attendance':
      return plan.attendanceEnabled || false;
    case 'homework':
      return plan.homeworkEnabled || false;
    case 'lesson-planning':
      return plan.lessonPlanningEnabled || false;
    default:
      return false;
  }
}

export async function requireFeatureAccess(feature: 'reports' | 'attendance' | 'homework' | 'lesson-planning'): Promise<void> {
  const hasAccess = await checkFeatureAccess(feature);
  if (!hasAccess) {
    throw new AuthError(`This feature is locked under your active plan. Upgrade your plan subscription to gain instant access.`, 403);
  }
}

export async function getSchoolPlan() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user || !session.user.schoolId) return null;

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    include: { plan: true },
  });

  return school?.plan || null;
}
