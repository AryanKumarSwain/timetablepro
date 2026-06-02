import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string; slotId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id: timetableId, slotId } = await context.params;

    const slot = await prisma.timetableSlot.findFirst({
      where: { id: slotId, timetableId, ...schoolWhere(schoolId) },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.timetableSlot.delete({ where: { id: slotId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
