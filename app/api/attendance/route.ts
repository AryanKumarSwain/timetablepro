import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacherAttendance } from '@/lib/mappers';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const date = request.nextUrl.searchParams.get('date') ?? '';
    const classId = request.nextUrl.searchParams.get('classId');
    const periodId = request.nextUrl.searchParams.get('periodId');

    const rows = await prisma.teacherAttendance.findMany({
      where: { ...schoolWhere(schoolId), ...(date ? { date } : {}) },
    });

    if (classId && periodId && date) {
      const dayOfWeek =
        new Date(`${date}T12:00:00`).getDay() === 0
          ? 7
          : new Date(`${date}T12:00:00`).getDay();
      const slot = await prisma.weeklyTimetableSlot.findFirst({
        where: { schoolId, classId, periodId, dayOfWeek },
      });
      return NextResponse.json(
        rows
          .filter((r) => r.teacherId === slot?.teacherId)
          .map((r) =>
            mapTeacherAttendance(r, {
              classId,
              periodId,
              subjectId: slot?.subjectId,
            })
          )
      );
    }

    return NextResponse.json(rows.map((r) => mapTeacherAttendance(r)));
  } catch (error) {
    console.error('[GET /api/attendance]', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const date = String(body.date);
    const teacherId = String(body.teacherId);
    const isAbsent = Boolean(body.isAbsent);
    const classId = body.classId ? String(body.classId) : undefined;
    const periodId = body.periodId ? String(body.periodId) : undefined;

    const row = await prisma.teacherAttendance.upsert({
      where: { teacherId_date: { teacherId, date } },
      create: {
        id: `attendance-${crypto.randomUUID()}`,
        schoolId,
        teacherId,
        date,
        status: isAbsent ? 'ABSENT' : 'PRESENT',
      },
      update: { status: isAbsent ? 'ABSENT' : 'PRESENT' },
    });

    let subjectId: string | undefined;
    if (classId && periodId) {
      const dayOfWeek =
        new Date(`${date}T12:00:00`).getDay() === 0
          ? 7
          : new Date(`${date}T12:00:00`).getDay();
      const slot = await prisma.weeklyTimetableSlot.findFirst({
        where: { schoolId, classId, periodId, dayOfWeek },
      });
      subjectId = slot?.subjectId;
    }

    return NextResponse.json(
      mapTeacherAttendance(row, { classId, periodId, subjectId })
    );
  } catch (error) {
    console.error('[POST /api/attendance]', error);
    return handleApiError(error);
  }
}
