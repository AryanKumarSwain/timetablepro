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
  let schoolId = user.schoolId;

  if (!schoolId && user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { schoolId: true },
    });
    if (dbUser?.schoolId) {
      schoolId = dbUser.schoolId;
    }
  }

  if (!schoolId) {
    throw new AuthError('School context required', 403);
  }
  return { ...user, schoolId };
}

export async function requireSchoolContext(): Promise<{
  user: SessionUser;
  schoolId: string;
}> {
  const user = await requireSession();
  let schoolId = user.schoolId;

  if (!schoolId && user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { schoolId: true },
    });
    if (dbUser?.schoolId) {
      schoolId = dbUser.schoolId;
    }
  }

  if (!schoolId) {
    throw new AuthError('School context required', 403);
  }

  return { user, schoolId };
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
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API Error]:', error);
  } else {
    const msg = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[API Error in Production]:', msg);
  }
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
    include: { plan: true, trialPlan: true },
  });

  if (!school) return null;

  if (
    school.trialStatus === 'APPROVED' &&
    school.trialEndsAt &&
    new Date(school.trialEndsAt) > new Date() &&
    school.trialPlan
  ) {
    return school.trialPlan;
  }

  return school.plan || null;
}

export async function getSchoolExportConfig() {
  const plan = await getSchoolPlan();

  let formats: string[] = [];
  if (plan) {
    const raw = (plan as any).exportFormats;
    if (Array.isArray(raw)) {
      formats = raw.map((f: any) => String(f).toLowerCase().trim());
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          formats = parsed.map((f: any) => String(f).toLowerCase().trim());
        }
      } catch {
        formats = [];
      }
    }
  }

  // Fallback to pdf if nothing configured
  if (formats.length === 0) {
    formats = ['pdf'];
  }

  const watermarkRequired = (plan as any)?.watermarkRequired !== false;

  const isFormatAllowed = (targetFormat: string) => {
    const fmt = targetFormat.toLowerCase().trim();
    if (fmt === 'word' || fmt === 'docx') {
      return formats.includes('docx') || formats.includes('word');
    }
    return formats.includes(fmt);
  };

  return {
    plan,
    planName: plan?.name || 'Free',
    exportFormats: formats,
    watermarkRequired,
    isFormatAllowed,
  };
}

export async function requireExportAccess(format: 'pdf' | 'docx' | 'csv' | 'word'): Promise<{
  watermarkRequired: boolean;
  planName: string;
  exportFormats: string[];
}> {
  const config = await getSchoolExportConfig();
  if (!config.isFormatAllowed(format)) {
    const label = format.toUpperCase() === 'DOCX' ? 'Word (DOCX)' : format.toUpperCase();
    throw new AuthError(
      `Export format "${label}" is not permitted under your current "${config.planName}" plan. Please upgrade your plan in settings to unlock this export format.`,
      403
    );
  }

  return {
    watermarkRequired: config.watermarkRequired,
    planName: config.planName,
    exportFormats: config.exportFormats,
  };
}

