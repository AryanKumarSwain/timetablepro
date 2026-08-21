import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolAdmin();

    const timetables = await prisma.timetable.findMany({
      where: schoolWhere(schoolId),
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { slots: true } } },
    });

    return NextResponse.json(
      timetables.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        slotCount: t._count.slots,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const body = await request.json();
    const name = String(body.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const timetableCount = await prisma.timetable.count({
      where: schoolWhere(schoolId),
    });

    if (timetableCount >= 30) {
      return NextResponse.json(
        { error: 'Timetable creation limit reached. You can create up to 30 timetables.' },
        { status: 400 }
      );
    }

    // Default configuration payload explicitly passed for the Json type block
    const defaultWorkingDays = [1, 2, 3, 4, 5];

    const timetable = await prisma.timetable.create({
      data: { 
        name, 
        schoolId,
        baseStartTime: "08:00",
        periodDuration: 45,
        workingDays: defaultWorkingDays as any, // Casted safely for Prisma Client validation matching
      },
    });

    return NextResponse.json({
      id: timetable.id,
      name: timetable.name,
      status: timetable.status,
      slotCount: 0,
      createdAt: timetable.createdAt.toISOString(),
      updatedAt: timetable.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}