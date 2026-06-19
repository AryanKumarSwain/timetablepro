import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContextOptional, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReplacement } from '@/lib/mappers';
import { getScheduleSlots, getDayOfWeekFromDate } from '@/lib/timetable-source';

export async function GET(request: NextRequest) {
  const client = prisma;

  try {
    const { schoolId, user } = await requireSchoolContextOptional();

    // If teacher has no school assignment, return empty schedule
    if (!schoolId) {
      return NextResponse.json([]);
    }

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

    const [attendance, replacements, periods, classes, subjects, publishedTimetable, allReplacements, allTimetableSlots] = await Promise.all([
      client.teacherAttendance.findMany({
        where: { schoolId, teacherId: teacher.id, date: today },
      }),
      client.replacementAssignment.findMany({
        where: { schoolId, date: today, originalTeacherId: teacher.id },
      }),
      client.period.findMany({ where: schoolWhere(schoolId) }),
      client.classRoom.findMany({ where: schoolWhere(schoolId) }),
      client.subject.findMany({ where: schoolWhere(schoolId) }),
      client.timetable.findFirst({
        where: { schoolId, status: 'PUBLISHED' },
        include: { periods: true },
      }),
      client.replacementAssignment.findMany({
        where: { schoolId, date: today, replacementTeacherId: teacher.id, status: 'CONFIRMED' },
        include: { period: true, slot: { include: { subject: true } } },
      }),
      client.timetableSlot.findMany({
        where: { schoolId, teacherId: teacher.id },
        include: { period: true },
      }),
    ]);

    const periodMap = new Map(periods.map((p) => [p.id, p]));
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    // TODAY'S WORKLOAD CALCULATION
    // Count standard timetable periods for today (excluding breaks)
    const todaySlots = slots.filter((slot) => {
      const period = periodMap.get(slot.periodId);
      return period && !period.isBreak;
    });
    
    // Count active proxy/substitution events for today (where teacher is the replacement)
    const todayProxyAssignments = allReplacements.filter(
      (r) => r.date === today
    );
    
    const sessionsToday = todaySlots.length + todayProxyAssignments.length;

    // WEEKLY WORKLOAD (BURNOUT METER) CALCULATION
    let weeklyWorkload = {
      totalSlots: 0,
      assignedSlots: 0,
      burnoutIndex: 0,
    };

    if (publishedTimetable) {
      // Get working days configuration
      const workingDays = publishedTimetable.workingDays && Array.isArray(publishedTimetable.workingDays)
        ? publishedTimetable.workingDays.length
        : 5;

      // Get timetable-specific periods (excluding breaks)
      const timetablePeriods = publishedTimetable.periods || [];
      const activePeriods = timetablePeriods.filter((p: any) => !p.isBreak);
      
      // Calculate dynamic total base slots
      const dynamicTotalBaseSlots = activePeriods.length * workingDays;

      // Count weekly teacher slots (base timetable slots + proxy assignments)
      const weeklyBaseSlots = allTimetableSlots.filter((slot) => {
        const period = slot.period;
        return period && !period.isBreak;
      }).length;
      
      const weeklyProxyAssignments = allReplacements.length;
      const weeklyTeacherSlots = weeklyBaseSlots + weeklyProxyAssignments;

      // Compute burnout index
      const burnoutIndex = dynamicTotalBaseSlots > 0
        ? Math.round((weeklyTeacherSlots / dynamicTotalBaseSlots) * 100)
        : 0;

      weeklyWorkload = {
        totalSlots: dynamicTotalBaseSlots,
        assignedSlots: weeklyTeacherSlots,
        burnoutIndex,
      };
    }

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
        isProxy: false,
      };
    });

    // Add proxy assignments to the schedule
    const proxyScheduleItems = allReplacements
      .filter((r) => r.date === today)
      .map((replacement) => {
        const period = replacement.period;
        const slot = replacement.slot;
        const className = slot ? classMap.get(slot.classId) : '';
        const subjectName = slot?.subject ? subjectMap.get(slot.subject.id) : '';
        
        return {
          periodId: replacement.periodId,
          periodNumber: period?.periodNumber ?? 0,
          startTime: period?.startTime ?? '',
          endTime: period?.endTime ?? '',
          classId: replacement.classId,
          className: className || 'Unknown Class',
          subjectId: slot?.subjectId || '',
          subjectName: subjectName || 'Unknown Subject',
          isAbsent: false,
          replacement: mapReplacement(replacement),
          isProxy: true,
        };
      });

    // Merge regular schedule with proxy assignments
    const mergedSchedule = [...schedule, ...proxyScheduleItems].sort(
      (a, b) => Number(a.periodNumber) - Number(b.periodNumber)
    );

    return NextResponse.json({
      schedule: mergedSchedule,
      workload: {
        sessionsToday,
        weekly: weeklyWorkload,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
