import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReplacement } from '@/lib/mappers';

export async function GET(request: NextRequest) {
  const client = prisma;

  try {
    const { schoolId, user } = await requireSchoolContext();
    const teacherIdParam = request.nextUrl.searchParams.get('teacherId');
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek =
      new Date().getDay() === 0 ? 7 : new Date().getDay();

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

    const entries = await client.weeklyTimetableSlot.findMany({
      where: { schoolId, teacherId: teacher.id, dayOfWeek },
      include: { period: true, class: true, subject: true },
    });

    const [attendance, replacements] = await Promise.all([
      client.teacherAttendance.findMany({
        where: { schoolId, teacherId: teacher.id, date: today },
      }),
      client.replacementAssignment.findMany({
        where: { schoolId, date: today, originalTeacherId: teacher.id },
      }),
    ]);

    const isAbsent = attendance.some((a) => a.status === 'ABSENT');

    const schedule = entries.map((entry) => {
      const replacement = replacements.find(
        (r) => r.periodId === entry.periodId
      );
      return {
        periodId: entry.periodId,
        periodNumber: entry.period.periodNumber,
        startTime: entry.period.startTime,
        endTime: entry.period.endTime,
        classId: entry.classId,
        className: entry.class.name,
        subjectId: entry.subjectId,
        subjectName: entry.subject.name,
        isAbsent,
        replacement: replacement ? mapReplacement(replacement) : undefined,
      };
    });

    return NextResponse.json(schedule);
  } catch (error) {
    return handleApiError(error);
  }
}
