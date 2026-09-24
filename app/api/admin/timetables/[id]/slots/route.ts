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
    const roomId = body.roomId ? String(body.roomId) : null;

    if (!dayOfWeek || !periodId || !classId || !subjectId || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prevent teacher double-booking at the same day & period in another class
    const teacherConflict = await prisma.timetableSlot.findFirst({
      where: {
        timetableId,
        dayOfWeek,
        periodId,
        teacherId,
        classId: { not: classId },
      },
      include: {
        class: true,
      },
    });

    if (teacherConflict) {
      return NextResponse.json(
        { error: `Teacher is already assigned to ${teacherConflict.class.name} at this time.` },
        { status: 409 }
      );
    }

    // Prevent assigning a different teacher to a subject that already has another teacher in this class
    const existingSubjectTeacherSlot = await prisma.timetableSlot.findFirst({
      where: {
        timetableId,
        classId,
        subjectId,
        teacherId: { not: teacherId },
        NOT: {
          dayOfWeek,
          periodId,
        },
      },
      include: {
        teacher: true,
        subject: true,
      },
    });

    if (existingSubjectTeacherSlot) {
      return NextResponse.json(
        {
          error: `${existingSubjectTeacherSlot.subject?.name || 'This subject'} in this class is already assigned to ${existingSubjectTeacherSlot.teacher?.name || 'another teacher'}. Another teacher cannot be assigned to this subject for this class.`,
        },
        { status: 400 }
      );
    }

    // Prevent room double-booking at the same day & period in another class
    if (roomId) {
      const roomConflict = await prisma.timetableSlot.findFirst({
        where: {
          timetableId,
          dayOfWeek,
          periodId,
          roomId,
          classId: { not: classId },
        },
        include: {
          class: true,
        },
      });

      if (roomConflict) {
        return NextResponse.json(
          { error: `Room is already occupied by ${roomConflict.class.name} at this time.` },
          { status: 409 }
        );
      }
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
        roomId: roomId || undefined,
      },
      update: { subjectId, teacherId, roomId: roomId || undefined },
      include: {
        period: true,
        class: true,
        subject: true,
        teacher: true,
        room: true,
      },
    });

    return NextResponse.json({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      periodId: slot.periodId,
      classId: slot.classId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      roomId: slot.roomId || undefined,
      roomNumber: slot.room?.roomNumber || undefined,
      periodNumber: slot.period.periodNumber,
      className: slot.class.name,
      subjectName: slot.subject.name,
      teacherName: slot.teacher.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
