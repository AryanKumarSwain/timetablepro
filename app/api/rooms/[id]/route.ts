import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapRoom } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.room.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const row = await prisma.room.update({
      where: { id },
      data: {
        roomNumber: body.roomNumber ?? body.name ?? existing.roomNumber,
        floor: body.floor !== undefined ? (body.floor ? String(body.floor).trim() : null) : existing.floor,
        block: body.block !== undefined ? (body.block ? String(body.block).trim() : null) : existing.block,
        capacity: body.capacity ? parseInt(String(body.capacity), 10) : existing.capacity,
      },
    });
    return NextResponse.json(mapRoom(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const existing = await prisma.room.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
