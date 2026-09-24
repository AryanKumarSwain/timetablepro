import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id: timetableId } = await context.params;

    let timetable: any;
    try {
      timetable = await prisma.timetable.findFirst({
        where: { id: timetableId, ...schoolWhere(schoolId) },
        include: { slots: true },
      });
    } catch {
      timetable = await prisma.timetable.findFirst({
        where: { id: timetableId, ...schoolWhere(schoolId) },
      });
      if (timetable) {
        timetable.slots = await prisma.timetableSlot.findMany({
          where: { timetableId },
          select: {
            id: true,
            timetableId: true,
            schoolId: true,
            dayOfWeek: true,
            periodId: true,
            classId: true,
            subjectId: true,
            teacherId: true,
          },
        }).catch(() => []);
      }
    }

    if (!timetable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [timetablePeriods, classes, teachers, replacements] = await Promise.all([
      prisma.period.findMany({
        where: { schoolId, timetableId: timetableId },
        orderBy: { startTime: 'asc' },
      }).catch(() =>
        prisma.period.findMany({
          where: { schoolId },
          orderBy: { startTime: 'asc' },
        }).catch(() => [])
      ),
      prisma.classRoom.findMany({ where: schoolWhere(schoolId) }).catch(() => []),
      prisma.teacher.findMany({ where: { ...schoolWhere(schoolId), active: true } }).catch(() => []),
      prisma.replacementAssignment.findMany({
        where: schoolWhere(schoolId),
      }).catch(() => []),
    ]);

    // Use actual working days from timetable configuration, default to 5 if not set
    let workingDays = 5;
    if (timetable.workingDays) {
      if (Array.isArray(timetable.workingDays)) {
        workingDays = timetable.workingDays.length || 5;
      } else if (typeof timetable.workingDays === 'string') {
        try {
          const parsed = JSON.parse(timetable.workingDays);
          if (Array.isArray(parsed)) workingDays = parsed.length || 5;
        } catch {}
      }
    }
    
    // Exclude break periods from the calculation
    const activePeriods = (timetablePeriods || []).filter((p: any) => !p.isBreak);
    const totalWeeklySlots = Math.max(1, activePeriods.length * workingDays);
    const slots = timetable.slots || [];

    const classMap = new Map<string, string>();
    classes.forEach((c: any) => classMap.set(c.id, c.name));

    const classWorkload = classes.map((cls: any) => {
      const assigned = slots.filter((s: any) => s.classId === cls.id).length;
      const remaining = Math.max(0, totalWeeklySlots - assigned);
      const utilization =
        totalWeeklySlots > 0
          ? Math.round((assigned / totalWeeklySlots) * 100)
          : 0;
      return {
        classId: cls.id,
        name: cls.name,
        section: cls.section,
        assigned,
        total: totalWeeklySlots,
        remaining,
        utilization,
        isComplete: assigned >= totalWeeklySlots,
      };
    });

    const teacherWorkload = teachers.map((teacher: any) => {
      // Find all slots for this teacher in this timetable
      const teacherSlots = slots.filter((s: any) => s.teacherId === teacher.id);
      const assignedSlots = teacherSlots.length;

      // Group by class to show breakdown
      const classCountMap = new Map<string, number>();
      teacherSlots.forEach((s: any) => {
        const cName = classMap.get(s.classId) || s.classId || 'Class';
        classCountMap.set(cName, (classCountMap.get(cName) || 0) + 1);
      });
      const classBreakdown = Array.from(classCountMap.entries()).map(([className, count]) => ({
        className,
        count,
      }));

      // Count active proxy/substitution assignments (confirmed status)
      const proxyAssignments = replacements.filter(
        (r: any) => r.replacementTeacherId === teacher.id && r.status === 'CONFIRMED'
      ).length;

      const totalAssigned = assignedSlots + proxyAssignments;
      const remaining = Math.max(0, totalWeeklySlots - totalAssigned);
      const utilization =
        totalWeeklySlots > 0 ? Math.round((totalAssigned / totalWeeklySlots) * 100) : 0;

      return {
        teacherId: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        assigned: totalAssigned,
        standardSlots: assignedSlots,
        proxySlots: proxyAssignments,
        total: totalWeeklySlots,
        remaining,
        utilization,
        classBreakdown,
      };
    });

    return NextResponse.json({
      classWorkload,
      teacherWorkload,
      totalWeeklySlots,
      activePeriodsCount: activePeriods.length,
      workingDaysCount: workingDays,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
