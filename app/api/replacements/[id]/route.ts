import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReplacement } from '@/lib/mappers';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.replacementAssignment.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const status =
      body.status === 'confirmed' || body.status === 'CONFIRMED'
        ? 'CONFIRMED'
        : 'PENDING';

    const row = await prisma.replacementAssignment.update({
      where: { id },
      data: { status },
    });

    // Revalidate cache for all teacher pages that display proxy data
    revalidatePath('/teacher/schedule');
    revalidatePath('/teacher/weekly-schedule');
    revalidatePath('/teacher/report/today');
    revalidatePath('/teacher/report/history');

    return NextResponse.json(mapReplacement(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const existing = await prisma.replacementAssignment.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.replacementAssignment.delete({ where: { id } });

    // Revalidate cache for all teacher pages that display proxy data
    revalidatePath('/teacher/schedule');
    revalidatePath('/teacher/weekly-schedule');
    revalidatePath('/teacher/report/today');
    revalidatePath('/teacher/report/history');

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
