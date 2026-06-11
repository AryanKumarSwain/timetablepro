import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { getDayOfWeekFromDate } from '@/lib/timetable-source';
import { mapTeacherAttendance } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const date = request.nextUrl.searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dayOfWeek = getDayOfWeekFromDate(date);

    const activeTimetable = await prisma.timetable.findFirst({
      where: { schoolId, status: 'PUBLISHED' },
    });

    if (!activeTimetable) {
      return NextResponse.json({ date, dayOfWeek, grid: [], hasActiveSlots: false });
    }

    const [periods, classes, subjects, teachers, attendance, replacements] = await Promise.all([
      prisma.period.findMany({ where: { schoolId, timetableId: activeTimetable.id }, orderBy: { startTime: 'asc' } }),
      prisma.classRoom.findMany({ where: schoolWhere(schoolId), orderBy: { name: 'asc' } }),
      prisma.subject.findMany({ where: schoolWhere(schoolId) }),
      prisma.teacher.findMany({ where: schoolWhere(schoolId) }),
      prisma.teacherAttendance.findMany({ where: { ...schoolWhere(schoolId), date } }),
      prisma.replacementAssignment.findMany({ 
        where: { ...schoolWhere(schoolId), date },
        include: { replacementTeacher: true } // Ensure we have teacher data
      }),
    ]);

    const slots = await prisma.timetableSlot.findMany({
      where: { schoolId, timetableId: activeTimetable.id, dayOfWeek, periodId: { in: periods.map(p => p.id) } },
    });
    
    const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const grid = periods.map((period) => ({
      periodId: period.id,
      periodNumber: period.periodNumber,
      label: period.isBreak ? (period.label || 'BREAK') : `Period ${period.periodNumber}`,
      cells: classes.map((cls) => {
        const slot = slots.find((s) => s.periodId === period.id && s.classId === cls.id);
        if (!slot) return { classId: cls.id, className: cls.name, empty: true };

        const replacement = replacements.find((r) => r.periodId === slot.periodId && r.classId === slot.classId);

        return {
          classId: cls.id,
          slotId: slot.id,
          subjectName: subjectMap.get(slot.subjectId),
          teacherName: teacherMap.get(slot.teacherId),
          replacement: replacement ? {
            replacementTeacherName: replacement.replacementTeacher?.name || 'Unknown',
            status: replacement.status.toLowerCase()
          } : null
        };
      }),
    }));

    return NextResponse.json({ grid, date, dayOfWeek, hasActiveSlots: slots.length > 0 });
  } catch (error) {
    return handleApiError(error);
  }
}