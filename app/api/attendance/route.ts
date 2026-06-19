import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacherAttendance } from '@/lib/mappers';
import { getDayOfWeekFromDate } from '@/lib/timetable-source';

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
      const dayOfWeek = getDayOfWeekFromDate(date);

      const activeTimetable = await prisma.timetable.findFirst({
        where: { schoolId, status: 'PUBLISHED' },
      });

      const slot = activeTimetable
        ? await prisma.timetableSlot.findFirst({
            where: { schoolId, timetableId: activeTimetable.id, classId, periodId, dayOfWeek },
          })
        : null;

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

    // Delete existing attendance record for this teacher/date
    await prisma.teacherAttendance.deleteMany({
      where: { schoolId, teacherId, date }
    });

    // Delete pending replacement assignments for this teacher/date
    await prisma.replacementAssignment.deleteMany({
      where: { schoolId, originalTeacherId: teacherId, date, status: 'PENDING' }
    });

    let row;
    if (isAbsent) {
      // Create new attendance record as ABSENT
      row = await prisma.teacherAttendance.create({
        data: {
          id: `attendance-${crypto.randomUUID()}`,
          schoolId,
          teacherId,
          date,
          status: 'ABSENT',
        }
      });

      // Do not automatically create replacement assignments
      // Substitutions should be manually assigned via the daily desk
    } else {
      // When marking as PRESENT, don't create a record - absence is the default state
      // Return a dummy record for API compatibility
      row = {
        id: `attendance-${crypto.randomUUID()}`,
        schoolId,
        teacherId,
        date,
        status: 'PRESENT',
        createdAt: new Date(),
      } as any;
    }

    let subjectId: string | undefined;
    if (classId && periodId) {
      const dayOfWeek = getDayOfWeekFromDate(date);

      const activeTimetable = await prisma.timetable.findFirst({
        where: { schoolId, status: 'PUBLISHED' },
      });

      const slot = activeTimetable
        ? await prisma.timetableSlot.findFirst({
            where: { schoolId, timetableId: activeTimetable.id, classId, periodId, dayOfWeek },
          })
        : null;

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