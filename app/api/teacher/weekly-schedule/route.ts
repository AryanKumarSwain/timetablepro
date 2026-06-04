import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapWeeklySlot } from '@/lib/mappers';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const classId = request.nextUrl.searchParams.get('classId');
    const teacherId = request.nextUrl.searchParams.get('teacherId');

    const publishedTimetable = await prisma.timetable.findFirst({
      where: {
        ...schoolWhere(schoolId),
        status: 'PUBLISHED',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (publishedTimetable) {
      const rows = await prisma.timetableSlot.findMany({
        where: {
          ...schoolWhere(schoolId),
          timetableId: publishedTimetable.id,
          ...(classId ? { classId } : {}),
          ...(teacherId ? { teacherId } : {}),
        },
      });

      return NextResponse.json(
        rows.map((row) => ({
          id: row.id,
          classId: row.classId,
          dayOfWeek: row.dayOfWeek,
          periodId: row.periodId,
          teacherId: row.teacherId,
          subjectId: row.subjectId,
          createdAt: '',
          updatedAt: '',
        }))
      );
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
