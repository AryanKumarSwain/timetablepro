import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { checkTimetableLimit } from '@/lib/plan-limits';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    await checkTimetableLimit(schoolId);
    const { id: timetableId } = await context.params;
    const body = await request.json();

    const timetable = await prisma.timetable.findFirst({
      where: { id: timetableId, ...schoolWhere(schoolId) },
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rawDay = Number(body.dayOfWeek);
    // Normalize from 0-6 (Sunday-Saturday) to 1-7 (Monday-Sunday)
    const dayOfWeek = rawDay === 0 ? 7 : rawDay;
    const periodId = String(body.periodId);
    const classId = String(body.classId);
    const subjectId = String(body.subjectId);
    const teacherId = String(body.teacherId);

    if (!dayOfWeek || !periodId || !classId || !subjectId || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slot = await prisma.timetableSlot.upsert({
      where: {
        timetableId_dayOfWeek_periodId_classId: {
          timetableId,
          dayOfWeek,
          periodId,
          classId,
        },
      },
      create: {
        timetableId,
        schoolId,
        dayOfWeek,
        periodId,
        classId,
        subjectId,
        teacherId,
      },
      update: { subjectId, teacherId },
      include: {
        period: true,
        class: true,
        subject: true,
        teacher: true,
      },
    });

    return NextResponse.json({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      periodId: slot.periodId,
      classId: slot.classId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      periodNumber: slot.period.periodNumber,
      className: slot.class.name,
      subjectName: slot.subject.name,
      teacherName: slot.teacher.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
