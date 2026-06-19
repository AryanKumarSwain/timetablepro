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
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const dayOfWeek = queryDay ?? getDayOfWeekFromDate(todayDate.toISOString().split('T')[0]);
    // Use local date format to match database storage
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    const { slots } = await getScheduleSlots(schoolId, { teacherId: teacher.id, dayOfWeek });

    // Fetch proxy assignments for the teacher (include both CONFIRMED and PENDING)
    const proxyAssignments = await prisma.replacementAssignment.findMany({
      where: {
        schoolId,
        replacementTeacherId: teacher.id,
        date: todayString,
        status: { in: ['CONFIRMED', 'PENDING'] }
      },
    });

    // Fetch related data for proxy assignments
    const proxySlotIds = proxyAssignments.map(r => r.slotId).filter(Boolean) as string[];
    const proxyPeriodIds = proxyAssignments.map(r => r.periodId);
    
    const [proxySlotsData, proxyPeriodsData] = await Promise.all([
      proxySlotIds.length > 0 
        ? prisma.timetableSlot.findMany({
            where: { id: { in: proxySlotIds } },
            include: { subject: true }
          })
        : Promise.resolve([]),
      prisma.period.findMany({
        where: { id: { in: proxyPeriodIds } }
      })
    ]);

    const proxySlotMap = new Map(proxySlotsData.map(s => [s.id, s]));
    const proxyPeriodMap = new Map(proxyPeriodsData.map(p => [p.id, p]));

    const classes = await prisma.classRoom.findMany({ where: schoolWhere(schoolId) });
    const subjects = await prisma.subject.findMany({ where: schoolWhere(schoolId) });
    const periods = await prisma.period.findMany({ where: schoolWhere(schoolId) });

    const periodMap = new Map(periods.map((p) => [p.id, p]));
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    // Map regular slots
    const regularSlots = slots.map((slot) => {
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
        isProxy: false,
      };
    });

    // Map proxy assignments
    const proxySlots = proxyAssignments.map((replacement) => {
      const period = proxyPeriodMap.get(replacement.periodId);
      const slot = replacement.slotId ? proxySlotMap.get(replacement.slotId) : null;
      // Try to get class info from slot first, then fall back to replacement.classId
      const classObj = slot ? classMap.get(slot.classId) : classMap.get(replacement.classId);
      const className = classObj?.name || 'Unknown Class';
      // Try to get subject info from slot first, then fall back to empty
      const subjectObj = slot?.subject ? subjectMap.get(slot.subjectId) : null;
      const subjectName = subjectObj?.name || 'Unknown Subject';
      const subjectId = slot?.subjectId || '';

      return {
        periodId: replacement.periodId,
        periodNumber: period?.periodNumber ?? 0,
        startTime: period?.startTime ?? '',
        endTime: period?.endTime ?? '',
        classId: replacement.classId,
        className,
        subjectId,
        subjectName,
        isProxy: true,
      };
    });

    // Merge and sort by period number
    const allSlots = [...regularSlots, ...proxySlots].sort((a, b) => a.periodNumber - b.periodNumber);

    return NextResponse.json({
      scheduleSlots: allSlots,
    });
  } catch (error) {
    return handleApiError(error);
  }
}