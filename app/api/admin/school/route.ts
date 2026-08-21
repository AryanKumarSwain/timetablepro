import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';
import { checkAndUpdateSchoolPlanExpiry } from '@/lib/plan-expiry-helper';

export async function PATCH(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const name = String(body.name ?? '').trim();
    const address = body.address ? String(body.address).trim() : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const email = body.email ? String(body.email).trim() : undefined;
    const logo = body.logo ? String(body.logo).trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: 'Institute name is required' }, { status: 400 });
    }

    const school = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name,
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(logo !== undefined && { logo }),
      },
    });

    return NextResponse.json({ success: true, name: school.name });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    // Check and process auto-expiry or plan resumption
    await checkAndUpdateSchoolPlanExpiry(schoolId);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        plan: true,
        queuedPlan: true,
        pausedPlan: true,
        _count: {
          select: { teachers: true }
        }
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: school.name,
      address: (school as any).address,
      phone: (school as any).phone,
      email: (school as any).email,
      logo: (school as any).logo,
      planId: school.planId,
      planStartsAt: school.planStartsAt,
      planEndsAt: school.planEndsAt,
      queuedPlanId: school.queuedPlanId,
      queuedPlanStartsAt: school.queuedPlanStartsAt,
      queuedPlan: school.queuedPlan ? {
        id: school.queuedPlan.id,
        name: school.queuedPlan.name,
        teacherMin: school.queuedPlan.teacherMin,
        teacherMax: school.queuedPlan.teacherMax,
        priceMonthly: Number(school.queuedPlan.priceMonthly),
        reportEnabled: school.queuedPlan.reportEnabled,
        attendanceEnabled: school.queuedPlan.attendanceEnabled,
        homeworkEnabled: school.queuedPlan.homeworkEnabled,
        lessonPlanningEnabled: school.queuedPlan.lessonPlanningEnabled ?? false,
        exportFormats: school.queuedPlan.exportFormats,
        watermarkRequired: school.queuedPlan.watermarkRequired,
      } : null,
      pausedPlanId: (school as any).pausedPlanId,
      pausedPlanRemainingSeconds: (school as any).pausedPlanRemainingSeconds,
      pausedPlan: (school as any).pausedPlan ? {
        id: (school as any).pausedPlan.id,
        name: (school as any).pausedPlan.name,
        teacherMax: (school as any).pausedPlan.teacherMax,
      } : null,
      autoDowngradedAt: (school as any).autoDowngradedAt || null,
      licenseStatus: school.licenseStatus,
      teacherCount: school._count.teachers,
      plan: school.plan ? {
        id: school.plan.id,
        name: school.plan.name,
        teacherMin: school.plan.teacherMin,
        teacherMax: school.plan.teacherMax,
        priceMonthly: Number(school.plan.priceMonthly),
        reportEnabled: school.plan.reportEnabled,
        attendanceEnabled: school.plan.attendanceEnabled,
        homeworkEnabled: school.plan.homeworkEnabled,
        lessonPlanningEnabled: school.plan.lessonPlanningEnabled ?? false,
        exportFormats: school.plan.exportFormats,
        watermarkRequired: school.plan.watermarkRequired,
      } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

