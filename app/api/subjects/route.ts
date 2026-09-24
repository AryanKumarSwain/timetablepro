import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapSubject } from '@/lib/mappers';
import { checkSubjectLimit } from '@/lib/plan-limits';

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
    await checkSubjectLimit(schoolId);
    const body = await request.json();
    const rawName = String(body.name ?? '').trim();
    if (!rawName) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }

    // Check duplicate subject name in this school
    const duplicate = await prisma.subject.findFirst({
      where: {
        schoolId,
        name: rawName,
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Subject "${rawName}" already exists.` },
        { status: 400 }
      );
    }

    const classIds = Array.isArray(body.classIds)
      ? body.classIds.filter((x: any) => typeof x === 'string')
      : [];

    // Make subject code optional: if empty, auto-generate short uppercase code from name
    let code = String(body.code ?? '').trim().toUpperCase();
    if (!code) {
      code = rawName.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 5) || rawName.slice(0, 4).toUpperCase();
    }

    const row = await prisma.subject.create({
      data: {
        id: `subject-${crypto.randomUUID()}`,
        schoolId,
        name: rawName,
        code,
        classIds,
      },
    });
    return NextResponse.json(mapSubject(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
