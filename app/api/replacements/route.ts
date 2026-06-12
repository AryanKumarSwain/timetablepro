import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReplacement, mapLeaveReason } from '@/lib/mappers';
import { getDayOfWeekFromDate } from '@/lib/timetable-source';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const date = request.nextUrl.searchParams.get('date');
    const status = request.nextUrl.searchParams.get('status');

    const rows = await prisma.replacementAssignment.findMany({
      where: {
        ...schoolWhere(schoolId),
        ...(date ? { date } : {}),
        ...(status
          ? { status: status.toUpperCase() as 'PENDING' | 'CONFIRMED' }
          : {}),
      },
      include: {
        replacementTeacher: true,
        slot: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(rows.map(mapReplacement));
  } catch (error) {
    console.error('[GET /api/replacements]', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const requestedStatus = (String(body.status || '').toLowerCase() === 'confirmed') ? 'CONFIRMED' : 'PENDING';

    // Derive the timetable slot for this class + period on the active published timetable
    const activeTimetable = await prisma.timetable.findFirst({ where: { schoolId, status: 'PUBLISHED' } });
    if (!activeTimetable) {
      return NextResponse.json({ error: 'No active published timetable found for school' }, { status: 400 });
    }

    const dayOfWeek = getDayOfWeekFromDate(String(body.date));

    const slot = await prisma.timetableSlot.findFirst({
      where: {
        schoolId,
        timetableId: activeTimetable.id,
        classId: String(body.classId),
        periodId: String(body.periodId),
        dayOfWeek,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Could not resolve timetable slot for given classId, periodId, and dayOfWeek' }, { status: 400 });
    }

    const row = await prisma.replacementAssignment.create({
      data: {
        id: `replacement-${crypto.randomUUID()}`,
        schoolId,
        date: String(body.date),
        periodId: String(body.periodId),
        classId: String(body.classId),
        originalTeacherId: String(body.originalTeacherId),
        replacementTeacherId: String(body.replacementTeacherId),
        slotId: slot.id,
        reason: mapLeaveReason(String(body.reason ?? 'Leave')),
        status: requestedStatus as 'PENDING' | 'CONFIRMED',
      },
    });

    // Fetch created row including slot relation so mapper can surface subjectId
    const created = await prisma.replacementAssignment.findUnique({ 
      where: { id: row.id }, 
      include: { slot: true, replacementTeacher: true } 
    });
    
    return NextResponse.json(mapReplacement(created as any), { status: 201 });
  } catch (error) {
    console.error('[POST /api/replacements]', error);
    return handleApiError(error);
  }
}