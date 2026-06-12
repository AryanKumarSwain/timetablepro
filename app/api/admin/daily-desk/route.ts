import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { getDayOfWeekFromDate } from '@/lib/timetable-source';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user context and fetch corresponding School Identity ID
    const { schoolId } = await requireSchoolContext();

    // Parse target calendar string date parameters securely
    const date = request.nextUrl.searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dayOfWeek = getDayOfWeekFromDate(date);

    // 2. Fetch the active published schedule configuration
    const activeTimetable = await prisma.timetable.findFirst({
      where: { schoolId, status: 'PUBLISHED' },
    });

    if (!activeTimetable) {
      return NextResponse.json({ date, dayOfWeek, grid: [], hasActiveSlots: false });
    }

    // 3. Concurrently pull core master data layouts for this specific day
    const [periods, classes, subjects, teachers, attendance, replacements] = await Promise.all([
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
        include: { replacementTeacher: true },
      }),
    ]);

    // 4. Load master scheduling slots matching the extracted week index day
    const slots = await prisma.timetableSlot.findMany({
      where: {
        schoolId,
        timetableId: activeTimetable.id,
        dayOfWeek,
        periodId: { in: periods.map((p) => p.id) },
      },
    });

    // Generate reference optimization maps for O(1) identity queries
    const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    // Check if original faculty member is marked as ABSENT
    const isTeacherAbsent = (teacherId: string) =>
      attendance.some((a) => a.teacherId === teacherId && a.status === 'ABSENT');

    // 4b. Build a map: periodId -> Set of teacherIds already teaching some class in that period
    const busyTeachersByPeriod = new Map<string, Set<string>>();
    for (const slot of slots) {
      if (!busyTeachersByPeriod.has(slot.periodId)) {
        busyTeachersByPeriod.set(slot.periodId, new Set());
      }
      busyTeachersByPeriod.get(slot.periodId)!.add(slot.teacherId);
    }

    // Also include teachers already assigned as a replacement in that period (avoid double-booking)
    for (const r of replacements) {
      if (!busyTeachersByPeriod.has(r.periodId)) {
        busyTeachersByPeriod.set(r.periodId, new Set());
      }
      busyTeachersByPeriod.get(r.periodId)!.add(r.replacementTeacherId);
    }

    const busyTeachersByPeriodObj: Record<string, string[]> = {};
    for (const [periodId, teacherIds] of busyTeachersByPeriod.entries()) {
      busyTeachersByPeriodObj[periodId] = Array.from(teacherIds);
    }

    // 5. Build matrix timetable engine grid map
    const grid = periods.map((period) => ({
      periodId: period.id,
      periodNumber: period.periodNumber,
      label: period.isBreak ? (period.label || 'BREAK') : `Period ${period.periodNumber}`,
      cells: classes.map((cls) => {
        const slot = slots.find((s) => s.periodId === period.id && s.classId === cls.id);
        if (!slot) return { classId: cls.id, className: cls.name, empty: true };

        // Match replacements directly using slotId (matches Prisma schema structure).
        // Falls back safely to checking periodId and classId if slotId isn't populated on legacy records.
        const replacement = replacements.find((r) => {
          if ('slotId' in r && r.slotId) {
            return r.slotId === slot.id;
          }
          return r.periodId === slot.periodId && r.classId === slot.classId;
        }) ?? null;

        const originalAbsent = isTeacherAbsent(slot.teacherId);
        const isReplacementAbsent = replacement ? isTeacherAbsent(replacement.replacementTeacherId) : false;

        return {
          classId: cls.id,
          slotId: slot.id,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          subjectName: subjectMap.get(slot.subjectId) || 'Unknown Subject',
          teacherName: teacherMap.get(slot.teacherId) || 'Staff Member',
          isAbsent: originalAbsent,
          isReplacementAbsent,
          replacement: replacement
            ? {
                id: replacement.id,
                replacementTeacherId: replacement.replacementTeacherId,
                replacementTeacherName:
                  replacement.replacementTeacher?.name || teacherMap.get(replacement.replacementTeacherId) || 'Assigned Proxy',
                status: replacement.status.toLowerCase(),
              }
            : null,
        };
      }),
    }));

    // Normalize payloads before transferring data to client states
    const normalizedPeriods = periods.map((p) => ({
      id: p.id,
      periodNumber: p.periodNumber,
      startTime: p.startTime,
      endTime: p.endTime,
      isBreak: p.isBreak,
      label: p.label || (p.isBreak ? 'BREAK' : `Period ${p.periodNumber}`),
    }));

    const normalizedClasses = classes.map((c) => ({ id: c.id, name: c.name }));

    return NextResponse.json({
      grid,
      periods: normalizedPeriods,
      classes: normalizedClasses,
      date,
      dayOfWeek,
      attendance,
      replacements,
      busyTeachersByPeriod: busyTeachersByPeriodObj,
      hasActiveSlots: slots.length > 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}