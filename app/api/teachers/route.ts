import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();

    const teachers = await prisma.teacher.findMany({
      where: schoolWhere(schoolId),
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(teachers.map(mapTeacher));
  } catch (error) {
    console.error('[GET /api/teachers]', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const requestSubjects = normalizeStringArray(body.subjects);
    const subjectSpecialtyId =
      typeof body.subjectSpecialtyId === 'string' && body.subjectSpecialtyId
        ? body.subjectSpecialtyId
        : requestSubjects[0];

    // Attempt to find a fallback subject, but do not crash or block if it doesn't exist
    const fallbackSubject = await prisma.subject.findFirst({
      where: schoolWhere(schoolId),
      orderBy: { name: 'asc' },
    });

    // Resolve specialty if available, otherwise set it to null
    const resolvedSubjectSpecialtyId = subjectSpecialtyId || (fallbackSubject ? fallbackSubject.id : null);

    const teacher = await prisma.teacher.create({
      data: {
        name: String(body.name ?? '').trim(),
        email: String(body.email ?? '').trim().toLowerCase(),
        phone: String(body.phone ?? '').trim(),
        qualifications: normalizeStringArray(body.qualifications),
        subjects: requestSubjects.length > 0 ? requestSubjects : (resolvedSubjectSpecialtyId ? [resolvedSubjectSpecialtyId] : []),
        active: typeof body.active === 'boolean' ? body.active : true,
        joinDate: String(body.joinDate ?? new Date().toISOString().split('T')[0]),
        maxPeriodsPerWeek: Number(body.maxPeriodsPerWeek ?? 24),
        subjectSpecialtyId: resolvedSubjectSpecialtyId, // This will now accept null gracefully
        schoolId,
      },
    });

    return NextResponse.json(mapTeacher(teacher));
  } catch (error) {
    console.error('[POST /api/teachers]', error);
    return handleApiError(error);
  }
}