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

function serializePlan(plan: any, schoolCount: number) {
  return {
    id:                plan.id,
    name:              plan.name,
    teacherMin:        plan.teacherMin,
    teacherMax:        plan.teacherMax,
    priceMonthly:      Number(plan.priceMonthly),
    schoolCount,
    reportEnabled:         plan.reportEnabled,
    attendanceEnabled:     plan.attendanceEnabled,
    homeworkEnabled:       plan.homeworkEnabled,
    lessonPlanningEnabled: plan.lessonPlanningEnabled ?? false,
    watermarkRequired:     plan.watermarkRequired,
    exportFormats:         plan.exportFormats ?? [],
  };
}

export async function GET() {
  try {
    const plans = await prisma.saaSPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
      include: {
        _count: { select: { schools: true } },
      },
    });

    return NextResponse.json(
      plans.map((plan) => serializePlan(plan, plan._count.schools))
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

    const existing = await prisma.saaSPlan.findFirst({ where: { name: payload.name } });
    if (existing) {
      return NextResponse.json({ error: 'A plan with this name already exists.' }, { status: 409 });
    }

    const plan = await prisma.saaSPlan.create({
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

    return NextResponse.json(serializePlan(plan, 0), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}