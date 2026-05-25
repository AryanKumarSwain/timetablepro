import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.teacher.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = await prisma.teacher.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        maxPeriodsPerWeek: body.maxPeriodsPerWeek ?? existing.maxPeriodsPerWeek,
        subjectSpecialtyId:
          body.subjectSpecialtyId ?? body.subjects?.[0] ?? existing.subjectSpecialtyId,
      },
    });
    return NextResponse.json(mapTeacher(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    await prisma.weeklyTimetable.deleteMany({
      where: { teacherId: id },
    });

    await prisma.attendance.deleteMany({
      where: { teacherId: id },
    });

    await prisma.replacement.deleteMany({
      where: {
        OR: [
          { originalTeacherId: id },
          { replacementTeacherId: id },
        ],
      },
    });

    await prisma.teacher.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}