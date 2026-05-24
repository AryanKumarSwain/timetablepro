import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();
    const rows = await prisma.teacher.findMany({
      where: schoolWhere(schoolId),
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(rows.map(mapTeacher));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const row = await prisma.teacher.create({
      data: {
        id: `teacher-${crypto.randomUUID()}`,
        schoolId,
        name: String(body.name),
        email: String(body.email),
        phone: String(body.phone ?? ''),
        maxPeriodsPerWeek: Number(body.maxPeriodsPerWeek ?? 24),
        subjectSpecialtyId: String(
          body.subjectSpecialtyId ?? body.subjects?.[0] ?? ''
        ),
      },
    });
    return NextResponse.json(mapTeacher(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
