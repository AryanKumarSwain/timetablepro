import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, handleApiError } from '@/lib/auth-server';

/**
 * GET /api/teacher/timetable-periods
 * Fetch the teacher's assigned timetable periods
 * Query params: date (YYYY-MM-DD) to filter by specific date
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireSession();
    const teacher = await prisma.teacher.findFirst({
      where: { userId: sessionUser.id },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateFilter = searchParams.get('date');

    // Get all active timetables for the teacher's school
    const timetables = await prisma.timetable.findMany({
      where: {
        schoolId: teacher.schoolId!,
        status: 'PUBLISHED',
      },
      include: {
        slots: {
          where: {
            teacherId: teacher.id,
          },
          include: {
            class: true,
            subject: true,
            period: true,
          },
        },
      },
    });

    // Flatten slots from all timetables
    const allSlots = timetables.flatMap((timetable) => 
      timetable.slots.map((slot) => ({
        ...slot,
        timetableName: timetable.name,
      }))
    );

    // If a specific date is requested, filter by day of week
    let filteredSlots = allSlots;
    if (dateFilter) {
      const date = new Date(dateFilter);
      const dayOfWeek = date.getDay();
      filteredSlots = allSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);
    }

    return NextResponse.json(filteredSlots);
  } catch (error) {
    return handleApiError(error);
  }
}
