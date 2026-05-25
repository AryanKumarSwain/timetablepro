import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapWeeklySlot } from '@/lib/mappers';

export async function GET(request: NextRequest) {
  const client = prisma;

  try {
    const { schoolId } = await requireSchoolContext();
    const classId = request.nextUrl.searchParams.get('classId');

    const rows = await client.weeklyTimetableSlot.findMany({
      where: {
        ...schoolWhere(schoolId),
        ...(classId ? { classId } : {}),
      },
    });
    return NextResponse.json(rows.map(mapWeeklySlot));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const client = prisma;

  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const row = await client.weeklyTimetableSlot.create({
      data: {
        id: `slot-${crypto.randomUUID()}`,
        schoolId,
        dayOfWeek: Number(body.dayOfWeek),
        periodId: String(body.periodId),
        classId: String(body.classId),
        subjectId: String(body.subjectId),
        teacherId: String(body.teacherId),
      },
    });
    return NextResponse.json(mapWeeklySlot(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
