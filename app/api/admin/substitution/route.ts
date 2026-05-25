import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { findSubstituteCandidates } from '@/lib/substitution-engine';

/**
 * POST — Mark teacher absent for a slot and return ranked substitute candidates.
 * Body: { date, periodId, classId, originalTeacherId, subjectId? }
 */
export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const body = await request.json();

    const date = String(body.date ?? '');
    const periodId = String(body.periodId ?? '');
    const classId = String(body.classId ?? '');
    const originalTeacherId = String(body.originalTeacherId ?? '');

    if (!date || !periodId || !classId || !originalTeacherId) {
      return NextResponse.json(
        { error: 'date, periodId, classId, and originalTeacherId are required' },
        { status: 400 }
      );
    }

    const slot = await prisma.weeklyTimetableSlot.findFirst({
      where: {
        ...schoolWhere(schoolId),
        classId,
        periodId,
        teacherId: originalTeacherId,
        dayOfWeek:
          new Date(`${date}T12:00:00`).getDay() === 0
            ? 7
            : new Date(`${date}T12:00:00`).getDay(),
      },
    });

    const slotSubjectId =
      String(body.subjectId ?? '') || slot?.subjectId || '';

    await prisma.teacherAttendance.upsert({
      where: {
        teacherId_date: { teacherId: originalTeacherId, date },
      },
      create: {
        id: `attendance-${crypto.randomUUID()}`,
        schoolId,
        teacherId: originalTeacherId,
        date,
        status: 'ABSENT',
      },
      update: { status: 'ABSENT' },
    });

    const candidates = await findSubstituteCandidates({
      schoolId,
      date,
      periodId,
      classId,
      originalTeacherId,
      slotSubjectId,
    });

    const globalWarnings = candidates
      .filter((c) => c.warnings.length > 0)
      .flatMap((c) =>
        c.warnings.map((w) => ({ teacherId: c.teacherId, teacherName: c.name, message: w }))
      );

    return NextResponse.json({
      markedAbsent: true,
      candidates,
      warnings: globalWarnings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET — Preview substitutes without marking absent.
 */
export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { searchParams } = request.nextUrl;

    const date = searchParams.get('date') ?? '';
    const periodId = searchParams.get('periodId') ?? '';
    const classId = searchParams.get('classId') ?? '';
    const originalTeacherId = searchParams.get('originalTeacherId') ?? '';
    const subjectId = searchParams.get('subjectId') ?? '';

    if (!date || !periodId || !classId || !originalTeacherId) {
      return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
    }

    const candidates = await findSubstituteCandidates({
      schoolId,
      date,
      periodId,
      classId,
      originalTeacherId,
      slotSubjectId: subjectId,
    });

    return NextResponse.json({ candidates });
  } catch (error) {
    return handleApiError(error);
  }
}
