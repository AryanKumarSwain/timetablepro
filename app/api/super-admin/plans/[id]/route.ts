import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

const VALID_EXPORT_FORMATS = ['pdf', 'docx', 'csv'] as const;

function validatePlanPayload(body: any) {
  const errors: Record<string, string> = {};
  const name = String(body.name ?? '').trim();
  const teacherMin = Number(body.teacherMin);
  const teacherMax = Number(body.teacherMax);
  const priceMonthly = Number(body.priceMonthly);

  if (!name) errors.name = 'Plan name is required.';
  if (!Number.isFinite(teacherMin) || teacherMin < 0)
    errors.teacherMin = 'Teacher minimum must be a valid non-negative number.';
  if (!Number.isFinite(teacherMax) || teacherMax < 0)
    errors.teacherMax = 'Teacher maximum must be a valid non-negative number.';
  if (Number.isFinite(teacherMin) && Number.isFinite(teacherMax) && teacherMax < teacherMin)
    errors.teacherMax = 'Maximum teachers must be greater than or equal to minimum teachers.';
  if (!Number.isFinite(priceMonthly) || priceMonthly < 0)
    errors.priceMonthly = 'Monthly price must be a valid non-negative number.';

  const exportFormats = Array.isArray(body.exportFormats)
    ? body.exportFormats.filter((f: any) => VALID_EXPORT_FORMATS.includes(f))
    : [];

  return {
    errors,
    payload: {
      name,
      teacherMin,
      teacherMax,
      priceMonthly,
      reportEnabled:         body.reportEnabled         !== undefined ? Boolean(body.reportEnabled)         : true,
      attendanceEnabled:     body.attendanceEnabled     !== undefined ? Boolean(body.attendanceEnabled)     : true,
      homeworkEnabled:       body.homeworkEnabled       !== undefined ? Boolean(body.homeworkEnabled)       : true,
      lessonPlanningEnabled: body.lessonPlanningEnabled !== undefined ? Boolean(body.lessonPlanningEnabled) : false,
      watermarkRequired:     body.watermarkRequired     !== undefined ? Boolean(body.watermarkRequired)     : false,
      exportFormats,
    },
  };
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
      where: { name: payload.name, NOT: { id: planId } },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'A plan with this name already exists.' }, { status: 409 });
    }

    const updated = await prisma.saaSPlan.update({
      where: { id: planId },
      data: {
        name:              payload.name,
        teacherMin:        payload.teacherMin,
        teacherMax:        payload.teacherMax,
        priceMonthly:      payload.priceMonthly,
        reportEnabled:         payload.reportEnabled,
        attendanceEnabled:     payload.attendanceEnabled,
        homeworkEnabled:       payload.homeworkEnabled,
        lessonPlanningEnabled: payload.lessonPlanningEnabled,
        watermarkRequired:     payload.watermarkRequired,
        exportFormats:         payload.exportFormats,
      },
    });

    const schoolCount = await prisma.school.count({ where: { planId: updated.id } });

    return NextResponse.json({
      id:                updated.id,
      name:              updated.name,
      teacherMin:        updated.teacherMin,
      teacherMax:        updated.teacherMax,
      priceMonthly:      Number(updated.priceMonthly),
      reportEnabled:         updated.reportEnabled,
      attendanceEnabled:     updated.attendanceEnabled,
      homeworkEnabled:       updated.homeworkEnabled,
      lessonPlanningEnabled: updated.lessonPlanningEnabled ?? false,
      watermarkRequired:     updated.watermarkRequired,
      exportFormats:         updated.exportFormats ?? [],
      schoolCount,
    });
  } catch (error) {
    console.error('[PATCH /api/super-admin/plans/[id]]', error);
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
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

    let body: { force?: boolean } = {};
    try { body = await request.json(); } catch { /* no body is fine */ }
    const force = body.force === true;

    const assignedSchools = await prisma.school.count({ where: { planId } });
    if (assignedSchools > 0 && !force) {
      return NextResponse.json(
        {
          error: 'Cannot delete this plan because it is assigned to existing schools. Use force=true to delete anyway.',
          assignedSchools,
        },
        { status: 400 }
      );
    }

    if (assignedSchools > 0 && force) {
      await prisma.school.updateMany({
        where: { planId },
        data: { planId: null },
      });
    }

    await prisma.saaSPlan.delete({ where: { id: planId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/super-admin/plans/[id]]', error);
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}