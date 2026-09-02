import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapRoom } from '@/lib/mappers';
import { checkRoomLimit } from '@/lib/plan-limits';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();
    const rows = await prisma.room.findMany({
      where: schoolWhere(schoolId),
      orderBy: [{ roomNumber: 'asc' }],
    });
    return NextResponse.json(rows.map(mapRoom));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    await checkRoomLimit(schoolId);
    const body = await request.json();
    const roomNumber = String(body.roomNumber || body.name || '').trim();
    if (!roomNumber) {
      return NextResponse.json({ error: 'Room number is required' }, { status: 400 });
    }

    const row = await prisma.room.create({
      data: {
        id: `room-${crypto.randomUUID()}`,
        schoolId,
        roomNumber,
        floor: body.floor ? String(body.floor).trim() : null,
        block: body.block ? String(body.block).trim() : null,
        capacity: body.capacity ? parseInt(String(body.capacity), 10) : 40,
      },
    });
    return NextResponse.json(mapRoom(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
