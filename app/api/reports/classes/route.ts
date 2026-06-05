import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { getScheduleSlots, getDayOfWeekFromDate } from '@/lib/timetable-source';

async function resolveTeacher(schoolId: string, userEmail: string) {
  return prisma.teacher.findFirst({
    where: { schoolId, email: userEmail },
  });
}

// FIX: Parameter changed from 'req' to 'request' to match the query parsing logic below
export async function GET(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teacher = await resolveTeacher(schoolId, user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const parseDayValue = (value: string | null): number | null => {
      if (!value) return null;
      const normalized = value.trim();
      const numeric = Number(normalized);
      if (!Number.isNaN(numeric)) {
        if (numeric === 0) return 7;
        return numeric;
      }
      const dayName = normalized.toLowerCase();
      switch (dayName) {
        case 'sunday':
        case 'sun':
          return 7;
        case 'monday':
        case 'mon':
          return 1;
        case 'tuesday':
        case 'tue':
        case 'tues':
          return 2;
        case 'wednesday':
        case 'wed':
          return 3;
        case 'thursday':
        case 'thu':
        case 'thurs':
          return 4;
        case 'friday':
        case 'fri':
          return 5;
        case 'saturday':
        case 'sat':
          return 6;
        default:
          return null;
      }
    };

    // Now 'request' is correctly defined and won't throw a ReferenceError
    const queryDay = parseDayValue(request.nextUrl.searchParams.get('day') ?? request.nextUrl.searchParams.get('dayOfWeek'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = queryDay ?? getDayOfWeekFromDate(today.toISOString().split('T')[0]);

    const { slots } = await getScheduleSlots(schoolId, { teacherId: teacher.id, dayOfWeek });

    const classes = await prisma.classRoom.findMany({ where: schoolWhere(schoolId) });
    const subjects = await prisma.subject.findMany({ where: schoolWhere(schoolId) });
    const periods = await prisma.period.findMany({ where: schoolWhere(schoolId) });

    const periodMap = new Map(periods.map((p) => [p.id, p]));
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    return NextResponse.json({
      scheduleSlots: slots
        .map((slot) => {
          const period = periodMap.get(slot.periodId);
          return {
            periodId: slot.periodId,
            periodNumber: period?.periodNumber ?? 0,
            startTime: period?.startTime ?? '',
            endTime: period?.endTime ?? '',
            classId: slot.classId,
            className: classMap.get(slot.classId)?.name ?? '',
            subjectId: slot.subjectId,
            subjectName: subjectMap.get(slot.subjectId)?.name ?? '',
          };
        })
        .sort((a, b) => a.periodNumber - b.periodNumber),
    });
  } catch (error) {
    return handleApiError(error);
  }
}