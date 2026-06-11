import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';
import { provisionTeacherUserAccount } from '@/lib/teacher-onboarding';

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const email = String(body.email ?? '').trim().toLowerCase();

    // 1. DUPLICATE CHECK: Prevent identical email profiles within the same system
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        email,
        schoolId, // Checks inside your specific school context
      },
    });

    if (existingTeacher) {
      return NextResponse.json(
        { error: 'A teacher profile with this email address already exists.' },
        { status: 400 } // Clean client bad request error status instead of crashing with a 500
      );
    }

    const requestSubjects = normalizeStringArray(body.subjects);
    let subjectSpecialtyId =
      typeof body.subjectSpecialtyId === 'string' && body.subjectSpecialtyId
        ? body.subjectSpecialtyId
        : requestSubjects[0];

    // Look for an existing subject
    let fallbackSubject = await prisma.subject.findFirst({
      where: schoolWhere(schoolId),
      orderBy: { name: 'asc' },
    });

    // If zero subjects exist in the database, fallback dynamically
    if (!subjectSpecialtyId && !fallbackSubject) {
      fallbackSubject = await prisma.subject.create({
        data: {
          name: 'General / Unassigned',
          code: 'GEN-01',
          schoolId,
        },
      });
    }

    const resolvedSubjectSpecialtyId = subjectSpecialtyId || fallbackSubject!.id;

    // 2. CREATE RECORD safely since email validation passed
    const teacher = await prisma.teacher.create({
      data: {
        name: String(body.name ?? '').trim(),
        email,
        phone: String(body.phone ?? '').trim(),
        qualifications: normalizeStringArray(body.qualifications),
        subjects:
          requestSubjects.length > 0
            ? requestSubjects
            : [resolvedSubjectSpecialtyId],
        active: typeof body.active === 'boolean' ? body.active : true,
        joinDate: String(body.joinDate ?? new Date().toISOString().split('T')[0]),
        maxPeriodsPerWeek: Number(body.maxPeriodsPerWeek ?? 24),
        subjectSpecialtyId: resolvedSubjectSpecialtyId,
        school: {
          connect: { id: schoolId }
        }
      },
    });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    await provisionTeacherUserAccount(teacher, school?.name ?? 'Your School');

    return NextResponse.json(mapTeacher(teacher));
  } catch (error) {
    console.error('[POST /api/admin/teachers/create]', error);
    return handleApiError(error);
  }
}