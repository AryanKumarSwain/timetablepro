import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    const timetable = await prisma.timetable.findFirst({
      where: { id, ...schoolWhere(schoolId) },
      select: { id: true, name: true },
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    const slots = await prisma.timetableSlot.findMany({
      where: { timetableId: id, schoolId },
      select: {
        teacherId: true,
        subjectId: true,
        classId: true,
      },
    });

    const teacherSubjectMap: Record<string, string[]> = {};
    const teacherSubjectClassMap: Record<string, Record<string, string[]>> = {};

    for (const slot of slots) {
      const { teacherId, subjectId, classId } = slot;
      if (!teacherId || !subjectId) continue;

      // Add subject to teacherSubjectMap
      if (!teacherSubjectMap[teacherId]) {
        teacherSubjectMap[teacherId] = [];
      }
      if (!teacherSubjectMap[teacherId].includes(subjectId)) {
        teacherSubjectMap[teacherId].push(subjectId);
      }

      // Add class to teacherSubjectClassMap
      if (!teacherSubjectClassMap[teacherId]) {
        teacherSubjectClassMap[teacherId] = {};
      }
      if (!teacherSubjectClassMap[teacherId][subjectId]) {
        teacherSubjectClassMap[teacherId][subjectId] = [];
      }
      if (classId && !teacherSubjectClassMap[teacherId][subjectId].includes(classId)) {
        teacherSubjectClassMap[teacherId][subjectId].push(classId);
      }
    }

    return NextResponse.json({
      timetableId: timetable.id,
      timetableName: timetable.name,
      slotCount: slots.length,
      teacherCount: Object.keys(teacherSubjectMap).length,
      teacherSubjectMap,
      teacherSubjectClassMap,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
