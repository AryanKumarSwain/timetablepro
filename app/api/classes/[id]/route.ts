import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapClass } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.classRoom.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const row = await prisma.classRoom.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        grade: String(body.grade ?? body.classLevel ?? existing.grade),
        section: body.section ?? existing.section,
        roomNumber: body.roomNumber ?? existing.roomNumber,
      },
    });
    return NextResponse.json(mapClass(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const existing = await prisma.classRoom.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete dependent rows first to avoid foreign key constraint errors
    await prisma.$transaction([
      prisma.timetableSlot.deleteMany({
        where: { schoolId, classId: id },
      }),
      prisma.weeklyTimetableSlot.deleteMany({
        where: { schoolId, classId: id },
      }),
      prisma.classRoom.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    // Handle foreign key constraint error gracefully
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete class because it has active sections or assignments linked to it.' },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
