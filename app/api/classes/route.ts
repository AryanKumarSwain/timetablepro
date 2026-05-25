import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapClass } from '@/lib/mappers';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();
    const rows = await prisma.classRoom.findMany({
      where: schoolWhere(schoolId),
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });
    return NextResponse.json(rows.map(mapClass));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();
    const row = await prisma.classRoom.create({
      data: {
        id: `class-${crypto.randomUUID()}`,
        schoolId,
        name: String(body.name),
        grade: String(body.grade ?? body.classLevel ?? ''),
        section: String(body.section ?? ''),
        roomNumber: String(body.roomNumber ?? ''),
      },
    });
    return NextResponse.json(mapClass(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
