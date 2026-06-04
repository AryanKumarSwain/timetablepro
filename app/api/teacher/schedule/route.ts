import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReplacement } from '@/lib/mappers';
import { getScheduleSlots, getDayOfWeekFromDate } from '@/lib/timetable-source';

export async function GET(request: NextRequest) {
  const client = prisma;

  try {
    const { schoolId, user } = await requireSchoolContext();
    const teacherIdParam = request.nextUrl.searchParams.get('teacherId');
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeekFromDate(today);

    const teacher = await client.teacher.findFirst({
      where: {
        ...schoolWhere(schoolId),
        ...(teacherIdParam
          ? { id: teacherIdParam }
          : { email: user.email }),
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }

    const { slots } = await getScheduleSlots(schoolId, {
      dayOfWeek,
      teacherId: teacher.id,
    });

    const [attendance, replacements, periods, classes, subjects] = await Promise.all([
      client.teacherAttendance.findMany({
        where: { schoolId, teacherId: teacher.id, date: today },
      }),
      client.replacementAssignment.findMany({
        where: { schoolId, date: today, originalTeacherId: teacher.id },
      }),
      client.period.findMany({ where: schoolWhere(schoolId) }),
      client.classRoom.findMany({ where: schoolWhere(schoolId) }),
      client.subject.findMany({ where: schoolWhere(schoolId) }),
    ]);

    const periodMap = new Map(periods.map((p) => [p.id, p]));
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const schedule = slots.map((slot) => {
      const period = periodMap.get(slot.periodId);
      const replacement = replacements.find(
        (r) => r.periodId === slot.periodId
      );
      const isAbsent = attendance.some((a) => a.status === 'ABSENT');
      return {
        periodId: slot.periodId,
        periodNumber: period?.periodNumber ?? 0,
        startTime: period?.startTime ?? '',
        endTime: period?.endTime ?? '',
        classId: slot.classId,
        className: classMap.get(slot.classId) ?? '',
        subjectId: slot.subjectId,
        subjectName: subjectMap.get(slot.subjectId) ?? '',
        isAbsent,
        replacement: replacement ? mapReplacement(replacement) : undefined,
      };
    });

    return NextResponse.json(schedule);
  } catch (error) {
    return handleApiError(error);
  }
}
