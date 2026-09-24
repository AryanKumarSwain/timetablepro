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
      prisma.teacher.findMany({ where: schoolWhere(schoolId) }).catch(() => []),
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
    const totalCellsPerClass = activePeriods.length * workingDays;
    const totalCellsPerTeacher = activePeriods.length * workingDays;
    const slots = timetable.slots || [];

    const classWorkload = classes.map((cls: any) => {
      const assigned = slots.filter((s: any) => s.classId === cls.id).length;
      const remaining = Math.max(0, totalCellsPerClass - assigned);
      const utilization =
        totalCellsPerClass > 0
          ? Math.round((assigned / totalCellsPerClass) * 100)
          : 0;
      return {
        classId: cls.id,
        name: cls.name,
        assigned,
        total: totalCellsPerClass,
        remaining,
        utilization,
      };
    });

    const teacherWorkload = teachers.map((teacher: any) => {
      // Count standard timetable slots
      const assignedSlots = slots.filter(
        (s: any) => s.teacherId === teacher.id
      ).length;
      
      // Count active proxy/substitution assignments (confirmed status)
      const proxyAssignments = replacements.filter(
        (r: any) => r.replacementTeacherId === teacher.id && r.status === 'CONFIRMED'
      ).length;
      
      // Total workload = standard slots + proxy assignments
      const totalAssigned = assignedSlots + proxyAssignments;
      
      // Use dynamic total based on active periods and working days
      const utilization =
        totalCellsPerTeacher > 0 ? Math.round((totalAssigned / totalCellsPerTeacher) * 100) : 0;
      
      return {
        teacherId: teacher.id,
        name: teacher.name,
        assigned: totalAssigned,
        total: totalCellsPerTeacher,
        remaining: Math.max(0, totalCellsPerTeacher - totalAssigned),
        utilization,
      };
    });

    return NextResponse.json({ classWorkload, teacherWorkload });
  } catch (error) {
    return handleApiError(error);
  }
}
