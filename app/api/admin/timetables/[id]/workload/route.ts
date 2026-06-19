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

    const timetable = await prisma.timetable.findFirst({
      where: { id: timetableId, ...schoolWhere(schoolId) },
      include: { slots: true },
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [timetablePeriods, classes, teachers, replacements] = await Promise.all([
      prisma.period.findMany({
        where: { schoolId, timetableId: timetableId },
        orderBy: { startTime: 'asc' },
      }),
      prisma.classRoom.findMany({ where: schoolWhere(schoolId) }),
      prisma.teacher.findMany({ where: schoolWhere(schoolId) }),
      prisma.replacementAssignment.findMany({
        where: schoolWhere(schoolId),
      }),
    ]);

    // Use actual working days from timetable configuration, default to 5 if not set
    const workingDays = timetable.workingDays && Array.isArray(timetable.workingDays) 
      ? timetable.workingDays.length 
      : 5;
    
    // Exclude break periods from the calculation
    const activePeriods = timetablePeriods.filter(p => !p.isBreak);
    const totalCellsPerClass = activePeriods.length * workingDays;
    const totalCellsPerTeacher = activePeriods.length * workingDays;

    const classWorkload = classes.map((cls) => {
      const assigned = timetable.slots.filter((s) => s.classId === cls.id).length;
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
      const assignedSlots = timetable.slots.filter(
        (s) => s.teacherId === teacher.id
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
