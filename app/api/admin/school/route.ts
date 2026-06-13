import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function PATCH(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const name = String(body.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Institute name is required' }, { status: 400 });
    }

    const school = await prisma.school.update({
      where: { id: schoolId },
      data: { name },
    });

    return NextResponse.json({ success: true, name: school.name });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            teacherMin: true,
            teacherMax: true,
            priceMonthly: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: school.name,
      plan: school.plan ? {
        id: school.plan.id,
        name: school.plan.name,
        teacherMin: school.plan.teacherMin,
        teacherMax: school.plan.teacherMax,
        priceMonthly: Number(school.plan.priceMonthly),
      } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
