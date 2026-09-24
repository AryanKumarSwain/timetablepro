import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapClass } from '@/lib/mappers';
import { checkClassLimit } from '@/lib/plan-limits';

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
    await checkClassLimit(schoolId);
    const body = await request.json();
    const name = String(body.name).trim();
    const section = String(body.section ?? '').trim();

    // Check if class with same name and section already exists in this school
    const duplicate = await prisma.classRoom.findFirst({
      where: {
        schoolId,
        name,
        section,
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Class "${name}" with Section "${section}" already exists.` },
        { status: 400 }
      );
    }

    const row = await prisma.classRoom.create({
      data: {
        id: `class-${crypto.randomUUID()}`,
        schoolId,
        name,
        grade: String(body.grade ?? body.classLevel ?? ''),
        section,
        roomNumber: String(body.roomNumber ?? ''),
      },
    });
    return NextResponse.json(mapClass(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
