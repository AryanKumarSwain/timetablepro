import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';
import { getSession } from '@/lib/session';

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
      aiTimetableEnabled:    body.aiTimetableEnabled    !== undefined ? Boolean(body.aiTimetableEnabled)    : false,
      watermarkRequired:     body.watermarkRequired     !== undefined ? Boolean(body.watermarkRequired)     : false,
      exportFormats,
    },
  };
}

function serializePlan(plan: any, schoolCount: number) {
  const isCustom = plan.id === 'plan-custom' || plan.name?.toLowerCase() === 'custom';
  return {
    id:                plan.id,
    name:              plan.name,
    isCustom,
    orderIndex:        plan.orderIndex ?? 0,
    teacherMin:        plan.teacherMin,
    teacherMax:        plan.teacherMax,
    priceMonthly:      Number(plan.priceMonthly),
    schoolCount,
    reportEnabled:         plan.reportEnabled,
    attendanceEnabled:     plan.attendanceEnabled,
    homeworkEnabled:       plan.homeworkEnabled,
    lessonPlanningEnabled: plan.lessonPlanningEnabled ?? false,
    aiTimetableEnabled:    plan.aiTimetableEnabled ?? false,
    watermarkRequired:     plan.watermarkRequired,
    exportFormats:         plan.exportFormats ?? [],
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    let plans: any[];
    try {
      plans = await prisma.saaSPlan.findMany({
        orderBy: [
          { orderIndex: 'asc' },
          { priceMonthly: 'asc' },
        ],
        include: {
          _count: { select: { schools: true } },
        },
      });
    } catch (queryErr) {
      plans = await prisma.saaSPlan.findMany({
        orderBy: { priceMonthly: 'asc' },
        include: {
          _count: { select: { schools: true } },
        },
      });
    }

    // Check if orderIndex or aiTimetableEnabled needs raw fallback
    let orderIndices: Record<string, number> = {};
    let aiFlags: Record<string, boolean> = {};
    try {
      let rawPlans: any[] = [];
      try {
        rawPlans = await prisma.$queryRawUnsafe('SELECT id, orderIndex, aiTimetableEnabled FROM `SaaSPlan`');
      } catch {
        rawPlans = await prisma.$queryRawUnsafe('SELECT id, orderIndex, aiTimetableEnabled FROM `saasplan`');
      }
      rawPlans.forEach((r) => {
        orderIndices[r.id] = Number(r.orderIndex ?? 0);
        aiFlags[r.id] = Boolean(r.aiTimetableEnabled);
      });
    } catch (e) {
      // Raw columns might not exist yet, ignore safely
    }

    // Determine if the caller is a school user whose active subscription has a grandfathered/locked price
    let activeSchoolPlanId: string | null = null;
    let activeSchoolSubscribedPrice: number | null = null;
    try {
      const session = await getSession();
      if (session?.isLoggedIn && session.user && session.user.role !== 'SUPER_ADMIN') {
        const schoolId = session.user.schoolId;
        if (schoolId) {
          const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
              planId: true,
              planEndsAt: true,
              subscribedPlanPrice: true,
            },
          });

          const now = new Date();
          const isPlanActive = Boolean(school?.planId && school?.planEndsAt && new Date(school.planEndsAt) > now);

          if (isPlanActive && school?.subscribedPlanPrice !== null && school?.subscribedPlanPrice !== undefined) {
            activeSchoolPlanId = school.planId;
            activeSchoolSubscribedPrice = Number(school.subscribedPlanPrice);
          }
        }
      }
    } catch (sessionErr) {
      // Ignore session errors and serve normal catalog prices
    }

    let customSchoolsCount = 0;
    try {
      customSchoolsCount = await prisma.school.count({
        where: {
          OR: [
            { planId: 'plan-custom' },
            { customTeacherLimit: { not: null } },
          ],
        },
      });
    } catch (countErr) {
      // ignore
    }

    const mappedPlans = plans.map((plan: any) => {
      const isCustom = plan.id === 'plan-custom' || plan.name?.toLowerCase() === 'custom';
      const count = isCustom ? customSchoolsCount : plan._count.schools;
      const serialized = serializePlan(plan, count);
      if (orderIndices[plan.id] !== undefined) {
        serialized.orderIndex = orderIndices[plan.id];
      }
      if (aiFlags[plan.id] !== undefined) {
        serialized.aiTimetableEnabled = aiFlags[plan.id];
      }
      // Active school sees their locked price for their currently active plan
      if (activeSchoolPlanId && plan.id === activeSchoolPlanId && activeSchoolSubscribedPrice !== null) {
        serialized.priceMonthly = activeSchoolSubscribedPrice;
      }
      return serialized;
    });

    mappedPlans.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    return NextResponse.json(mappedPlans, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
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

    let nextOrder = 1;
    try {
      const maxOrder = await prisma.saaSPlan.aggregate({ _max: { orderIndex: true } });
      nextOrder = (maxOrder._max?.orderIndex ?? 0) + 1;
    } catch {
      try {
        const count = await prisma.saaSPlan.count();
        nextOrder = count + 1;
      } catch {
        nextOrder = 1;
      }
    }

    let plan: any;
    try {
      plan = await prisma.saaSPlan.create({
        data: {
          name:              payload.name,
          orderIndex:        nextOrder,
          teacherMin:        payload.teacherMin,
          teacherMax:        payload.teacherMax,
          priceMonthly:      payload.priceMonthly,
          reportEnabled:         payload.reportEnabled,
          attendanceEnabled:     payload.attendanceEnabled,
          homeworkEnabled:       payload.homeworkEnabled,
          lessonPlanningEnabled: payload.lessonPlanningEnabled,
          aiTimetableEnabled:    payload.aiTimetableEnabled,
          watermarkRequired:     payload.watermarkRequired,
          exportFormats:         payload.exportFormats,
        },
      });
    } catch (createErr: any) {
      // Fallback if orderIndex or aiTimetableEnabled column does not exist yet
      try {
        plan = await prisma.saaSPlan.create({
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

        // Try raw update with both case variants if columns exist
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE `SaaSPlan` SET `aiTimetableEnabled` = ?, `orderIndex` = ? WHERE `id` = ?',
            payload.aiTimetableEnabled,
            nextOrder,
            plan.id
          );
        } catch {
          try {
            await prisma.$executeRawUnsafe(
              'UPDATE `saasplan` SET `aiTimetableEnabled` = ?, `orderIndex` = ? WHERE `id` = ?',
              payload.aiTimetableEnabled,
              nextOrder,
              plan.id
            );
          } catch {
            // Columns not in DB yet, ignore safely
          }
        }
        plan.aiTimetableEnabled = payload.aiTimetableEnabled;
        plan.orderIndex = nextOrder;
      } catch (fallbackErr: any) {
        throw createErr;
      }
    }

    return NextResponse.json(serializePlan(plan, 0), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}