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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id: planId } = await params;
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    const body = await request.json();
    const { errors, payload } = validatePlanPayload(body);

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const plan = await prisma.saaSPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
    }

    const duplicate = await prisma.saaSPlan.findFirst({
      where: {
        name: {
          equals: payload.name,
          mode: 'insensitive',
        },
        NOT: { id: planId },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'A plan with this name already exists.' },
        { status: 409 }
      );
    }

    const updated = await prisma.saaSPlan.update({
      where: { id: planId },
      data: {
        name: payload.name,
        teacherMin: payload.teacherMin,
        teacherMax: payload.teacherMax,
        priceMonthly: payload.priceMonthly,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      teacherMin: updated.teacherMin,
      teacherMax: updated.teacherMax,
      priceMonthly: Number(updated.priceMonthly),
      schoolCount: await prisma.school.count({ where: { planId: updated.id } }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id: planId } = await params;
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    const assignedSchools = await prisma.school.count({ where: { planId } });
    if (assignedSchools > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete this plan because it is assigned to existing schools. Reassign schools before deleting.',
        },
        { status: 400 }
      );
    }

    await prisma.saaSPlan.delete({ where: { id: planId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
