import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import {
  getScheduleSlots,
  getDayOfWeekFromDate,
} from '@/lib/timetable-source';
import { mapTeacherAttendance } from '@/lib/mappers';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const date =
      request.nextUrl.searchParams.get('date') ??
      new Date().toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeekFromDate(date);

    const { slots } = await getScheduleSlots(schoolId, { dayOfWeek });

    const [periods, classes, subjects, teachers, attendance, replacements] =
      await Promise.all([
        prisma.period.findMany({
          where: schoolWhere(schoolId),
          orderBy: { periodNumber: 'asc' },
        }),
        prisma.classRoom.findMany({
          where: schoolWhere(schoolId),
          orderBy: { name: 'asc' },
        }),
        prisma.subject.findMany({ where: schoolWhere(schoolId) }),
        prisma.teacher.findMany({ where: schoolWhere(schoolId) }),
        prisma.teacherAttendance.findMany({
          where: { ...schoolWhere(schoolId), date },
        }),
        prisma.replacementAssignment.findMany({
          where: { ...schoolWhere(schoolId), date },
        }),
      ]);

    const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
    const classMap = new Map(classes.map((c) => [c.id, c.name]));

    const grid = periods.map((period) => ({
      periodId: period.id,
      periodNumber: period.periodNumber,
      label: `Period ${period.periodNumber}`,
      startTime: period.startTime,
      endTime: period.endTime,
      cells: classes.map((cls) => {
        const slot = slots.find(
          (s) => s.periodId === period.id && s.classId === cls.id
        );
        if (!slot) {
          return { classId: cls.id, className: cls.name, empty: true as const };
        }

        const att = attendance.find((a) => a.teacherId === slot.teacherId);
        const replacement = replacements.find(
          (r) =>
            r.periodId === slot.periodId &&
            r.classId === slot.classId &&
            r.originalTeacherId === slot.teacherId
        );

        return {
          classId: cls.id,
          className: cls.name,
          empty: false as const,
          slotId: slot.id,
          subjectId: slot.subjectId,
          subjectName: subjectMap.get(slot.subjectId) ?? 'Unknown',
          teacherId: slot.teacherId,
          teacherName: teacherMap.get(slot.teacherId) ?? 'Unknown',
          isAbsent: att?.status === 'ABSENT',
          replacement: replacement
            ? {
                id: replacement.id,
                replacementTeacherId: replacement.replacementTeacherId,
                replacementTeacherName:
                  teacherMap.get(replacement.replacementTeacherId) ?? 'Unknown',
                status: replacement.status.toLowerCase(),
              }
            : null,
        };
      }),
    }));

    return NextResponse.json({
      date,
      dayOfWeek,
      classes: classes.map((c) => ({ id: c.id, name: c.name })),
      periods: periods.map((p) => ({
        id: p.id,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
      })),
      grid,
      attendance: attendance.map((a) => mapTeacherAttendance(a)),
      replacements,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
