import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapSubject } from '@/lib/mappers';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();
    const rows = await prisma.subject.findMany({
      where: schoolWhere(schoolId),
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(rows.map(mapSubject));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();
    const row = await prisma.subject.create({
      data: {
        id: `subject-${crypto.randomUUID()}`,
        schoolId,
        name: String(body.name),
        code: String(body.code),
      },
    });
    return NextResponse.json(mapSubject(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
