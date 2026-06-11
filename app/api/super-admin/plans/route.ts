import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

function validatePlanPayload(body: any) {
  const errors: Record<string, string> = {};
  const name = String(body.name ?? '').trim();
  const teacherMin = Number(body.teacherMin);
  const teacherMax = Number(body.teacherMax);
  const priceMonthly = Number(body.priceMonthly);

  if (!name) {
    errors.name = 'Plan name is required.';
  }
  if (!Number.isFinite(teacherMin) || teacherMin < 0) {
    errors.teacherMin = 'Teacher minimum must be a valid non-negative number.';
  }
  if (!Number.isFinite(teacherMax) || teacherMax < 0) {
    errors.teacherMax = 'Teacher maximum must be a valid non-negative number.';
  }
  if (Number.isFinite(teacherMin) && Number.isFinite(teacherMax) && teacherMax < teacherMin) {
    errors.teacherMax = 'Maximum teachers must be greater than or equal to minimum teachers.';
  }
  if (!Number.isFinite(priceMonthly) || priceMonthly < 0) {
    errors.priceMonthly = 'Monthly price must be a valid non-negative number.';
  }

  return { errors, payload: { name, teacherMin, teacherMax, priceMonthly } };
}

export async function GET() {
  try {
    await requireSuperAdmin();

    const plans = await prisma.saaSPlan.findMany({
      orderBy: { teacherMin: 'asc' },
      include: {
        _count: {
          select: {
            schools: true,
          },
        },
      },
    });

    return NextResponse.json(
      plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        teacherMin: plan.teacherMin,
        teacherMax: plan.teacherMax,
        priceMonthly: Number(plan.priceMonthly),
        schoolCount: plan._count.schools,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { errors, payload } = validatePlanPayload(body);

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const existing = await prisma.saaSPlan.findFirst({
      where: {
        name: {
          equals: payload.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A plan with this name already exists.' },
        { status: 409 }
      );
    }

    const plan = await prisma.saaSPlan.create({
      data: {
        name: payload.name,
        teacherMin: payload.teacherMin,
        teacherMax: payload.teacherMax,
        priceMonthly: payload.priceMonthly,
      },
    });

    return NextResponse.json(
      {
        id: plan.id,
        name: plan.name,
        teacherMin: plan.teacherMin,
        teacherMax: plan.teacherMax,
        priceMonthly: Number(plan.priceMonthly),
        schoolCount: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
