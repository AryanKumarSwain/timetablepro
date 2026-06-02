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

    const timetable = await prisma.timetable.create({
      data: { name, schoolId },
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
