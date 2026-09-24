import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapSubject } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.subject.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rawName = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!rawName) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }

    // Check duplicate subject name for another subject in this school
    const duplicate = await prisma.subject.findFirst({
      where: {
        schoolId,
        id: { not: id },
        name: rawName,
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Subject "${rawName}" already exists.` },
        { status: 400 }
      );
    }

    let code = existing.code;
    if (body.code !== undefined) {
      const trimmed = String(body.code).trim().toUpperCase();
      code = trimmed || (rawName.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 5) || rawName.slice(0, 4).toUpperCase());
    }

    const classIds = body.classIds !== undefined
      ? (Array.isArray(body.classIds) ? body.classIds.filter((x: any) => typeof x === 'string') : [])
      : (existing as any).classIds ?? [];

    const row = await prisma.subject.update({
      where: { id },
      data: {
        name: rawName,
        code,
        classIds,
      },
    });
    return NextResponse.json(mapSubject(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const existing = await prisma.subject.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
