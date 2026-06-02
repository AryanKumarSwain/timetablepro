import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReplacement, mapLeaveReason } from '@/lib/mappers';

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

    const row = await prisma.replacementAssignment.create({
      data: {
        id: `replacement-${crypto.randomUUID()}`,
        schoolId,
        date: String(body.date),
        periodId: String(body.periodId),
        classId: String(body.classId),
        originalTeacherId: String(body.originalTeacherId),
        replacementTeacherId: String(body.replacementTeacherId),
        reason: mapLeaveReason(String(body.reason ?? 'Leave')),
        status: 'PENDING',
      },
    });

    return NextResponse.json(mapReplacement(row), { status: 201 });
  } catch (error) {
    console.error('[POST /api/replacements]', error);
    return handleApiError(error);
  }
}
