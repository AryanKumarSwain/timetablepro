import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapWeeklySlot } from '@/lib/mappers';
import { getDayOfWeekFromDate } from '@/lib/timetable-source';

export async function GET(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    const classId = request.nextUrl.searchParams.get('classId');
    const teacherIdParam = request.nextUrl.searchParams.get('teacherId');

    // Resolve teacher ID from authenticated user if not provided
    let teacherId: string | null = teacherIdParam || null;
    if (!teacherId && user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({
        where: { schoolId, email: user.email },
      });
      teacherId = teacher?.id || null;
    }

    const publishedTimetable = await prisma.timetable.findFirst({
      where: {
        ...schoolWhere(schoolId),
        status: 'PUBLISHED',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (publishedTimetable) {
      const [rows, replacements] = await Promise.all([
        prisma.timetableSlot.findMany({
          where: {
            ...schoolWhere(schoolId),
            timetableId: publishedTimetable.id,
            ...(classId ? { classId } : {}),
            ...(teacherId ? { teacherId } : {}),
          },
        }),
        teacherId
          ? prisma.replacementAssignment.findMany({
              where: {
                ...schoolWhere(schoolId),
                replacementTeacherId: teacherId,
                status: 'CONFIRMED',
                ...(classId ? { classId } : {}),
              },
              include: { period: true, slot: { include: { subject: true } } },
            })
          : Promise.resolve([]),
      ]);

      const regularSlots = rows.map((row) => ({
        id: row.id,
        classId: row.classId,
        dayOfWeek: row.dayOfWeek,
        periodId: row.periodId,
        teacherId: row.teacherId,
        subjectId: row.subjectId,
        createdAt: '',
        updatedAt: '',
        isProxy: false,
      }));

      const proxySlots = replacements.map((replacement) => ({
        id: `proxy-${replacement.id}`,
        classId: replacement.classId,
        dayOfWeek: getDayOfWeekFromDate(replacement.date),
        periodId: replacement.periodId,
        teacherId: replacement.replacementTeacherId,
        subjectId: replacement.slot?.subjectId || '',
        createdAt: '',
        updatedAt: '',
        isProxy: true,
      }));

      return NextResponse.json([...regularSlots, ...proxySlots]);
    }

    const rows = await prisma.weeklyTimetableSlot.findMany({
      where: {
        ...schoolWhere(schoolId),
        ...(classId ? { classId } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
    });

    return NextResponse.json(rows.map(mapWeeklySlot));
  } catch (error) {
    return handleApiError(error);
  }
}