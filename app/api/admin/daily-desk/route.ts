import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { getDayOfWeekFromDate } from '@/lib/timetable-source';
import { mapTeacherAttendance } from '@/lib/mappers';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    
    // Timezone-safe local date fallback calculation
    const localTargetDate = new Date();
    const offset = localTargetDate.getTimezoneOffset();
    const safeLocalDate = new Date(localTargetDate.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

    const date = request.nextUrl.searchParams.get('date') ?? safeLocalDate;
    const dayOfWeek = getDayOfWeekFromDate(date);

    // 1. Locate the active PUBLISHED timetable
    const activeTimetable = await prisma.timetable.findFirst({
      where: {
        schoolId,
        status: 'PUBLISHED',
      },
    });

    if (!activeTimetable) {
      return NextResponse.json({
        date,
        dayOfWeek,
        classes: [],
        periods: [],
        grid: [],
        attendance: [],
        replacements: [],
        message: "No published timetable found."
      });
    }

    // 2. Fetch specific layout periods for this active published timetable instance
    const [periods, classes, subjects, teachers, attendance, replacements] =
      await Promise.all([
        prisma.period.findMany({
          where: { schoolId, timetableId: activeTimetable.id },
          orderBy: { startTime: 'asc' },
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

    let activePeriods = periods;
    if (activePeriods.length === 0) {
      activePeriods = await prisma.period.findMany({
        where: { schoolId, timetableId: null },
        orderBy: { startTime: 'asc' },
      });
    }

    // 3. Fetch slot rows using the discovered active period identifiers
    const slots = await prisma.timetableSlot.findMany({
      where: {
        timetableId: activeTimetable.id,
        dayOfWeek,
        periodId: { in: activePeriods.map(p => p.id) }
      },
    });

    const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    // 4. Form grid array map layouts
    const grid = activePeriods.map((period) => ({
      periodId: period.id,
      periodNumber: period.periodNumber,
      label: period.isBreak ? (period.label || 'BREAK') : `Period ${period.periodNumber}`,
      startTime: period.startTime,
      endTime: period.endTime,
      cells: classes.map((cls) => {
        const slot = slots.find(
          (s) => s.periodId === period.id && s.classId === cls.id
        );
        
        if (!slot) {
          return { classId: cls.id, className: cls.name, empty: true as const };
        }

        const originalTeacherAtt = attendance.find((a) => a.teacherId === slot.teacherId);
        const originalTeacherAbsent = originalTeacherAtt?.status === 'ABSENT';

        const replacement = replacements.find(
          (r) =>
            r.periodId === slot.periodId &&
            r.classId === slot.classId &&
            r.originalTeacherId === slot.teacherId
        );

        // --- CASCADING ABSENCE CHECK ---
        // If a replacement exists and is confirmed, check if that substitute teacher is ALSO absent
        let isReplacementAbsent = false;
        if (replacement && replacement.status.toLowerCase() === 'confirmed') {
          const replacementAtt = attendance.find((a) => a.teacherId === replacement.replacementTeacherId);
          if (replacementAtt?.status === 'ABSENT') {
            isReplacementAbsent = true;
          }
        }

        return {
          classId: cls.id,
          className: cls.name,
          empty: false as const,
          slotId: slot.id,
          subjectId: slot.subjectId,
          subjectName: subjectMap.get(slot.subjectId) ?? 'Unknown',
          teacherId: slot.teacherId,
          teacherName: teacherMap.get(slot.teacherId) ?? 'Unknown',
          isAbsent: originalTeacherAbsent,
          isReplacementAbsent: isReplacementAbsent, // Flag identifying that Jai Sir is also out
          replacement: replacement
            ? {
                id: replacement.id,
                replacementTeacherId: replacement.replacementTeacherId,
                replacementTeacherName: teacherMap.get(replacement.replacementTeacherId) ?? 'Unknown',
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
      periods: activePeriods.map((p) => ({
        id: p.id,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
      })),
      grid,
      attendance: attendance.map((a) => mapTeacherAttendance(a)),
      replacements,
    });
  } catch (error) {
    return handleApiError(error);
  }
}