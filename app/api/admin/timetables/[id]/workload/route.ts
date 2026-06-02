import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

const DAYS_PER_WEEK = 6;

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

    const [periods, classes, teachers] = await Promise.all([
      prisma.period.findMany({
        where: schoolWhere(schoolId),
        orderBy: { periodNumber: 'asc' },
      }),
      prisma.classRoom.findMany({ where: schoolWhere(schoolId) }),
      prisma.teacher.findMany({ where: schoolWhere(schoolId) }),
    ]);

    const totalCellsPerClass = periods.length * DAYS_PER_WEEK;
    const totalCellsPerTeacher = periods.length * DAYS_PER_WEEK;

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

    const teacherWorkload = teachers.map((teacher) => {
      const assigned = timetable.slots.filter(
        (s) => s.teacherId === teacher.id
      ).length;
      const maxLoad = teacher.maxPeriodsPerWeek;
      const utilization =
        maxLoad > 0 ? Math.round((assigned / maxLoad) * 100) : 0;
      return {
        teacherId: teacher.id,
        name: teacher.name,
        assigned,
        total: maxLoad,
        remaining: Math.max(0, maxLoad - assigned),
        utilization,
      };
    });

    return NextResponse.json({ classWorkload, teacherWorkload });
  } catch (error) {
    return handleApiError(error);
  }
}
