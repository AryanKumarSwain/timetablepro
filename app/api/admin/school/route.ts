import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';
import { checkAndUpdateSchoolPlanExpiry } from '@/lib/plan-expiry-helper';

export async function PATCH(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const name = String(body.name ?? '').trim();
    const address = body.address !== undefined ? String(body.address).trim() : undefined;
    const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
    const email = body.email !== undefined ? String(body.email).trim() : undefined;
    const website = body.website !== undefined ? String(body.website).trim() : undefined;
    const instagram = body.instagram !== undefined ? String(body.instagram).trim() : undefined;
    const facebook = body.facebook !== undefined ? String(body.facebook).trim() : undefined;
    const linkedin = body.linkedin !== undefined ? String(body.linkedin).trim() : undefined;
    const twitter = body.twitter !== undefined ? String(body.twitter).trim() : undefined;

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
        ...(website !== undefined && { website }),
        ...(instagram !== undefined && { instagram }),
        ...(facebook !== undefined && { facebook }),
        ...(linkedin !== undefined && { linkedin }),
        ...(twitter !== undefined && { twitter }),
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
        trialPlan: true,
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

    const isTrialActive =
      school.trialStatus === 'APPROVED' &&
      school.trialEndsAt &&
      new Date(school.trialEndsAt) > new Date() &&
      school.trialPlan;

    const effectivePlan = isTrialActive ? school.trialPlan : school.plan;

    const normalizedExportFormats = effectivePlan
      ? Array.isArray(effectivePlan.exportFormats)
        ? (effectivePlan.exportFormats as string[]).map((f) => String(f).toLowerCase())
        : ['pdf']
      : ['pdf'];

    const watermarkRequired = effectivePlan ? effectivePlan.watermarkRequired !== false : true;

    return NextResponse.json({
      name: school.name,
      address: school.address,
      phone: school.phone,
      email: school.email,
      website: school.website,
      instagram: school.instagram,
      facebook: school.facebook,
      linkedin: school.linkedin,
      twitter: school.twitter,
      planId: effectivePlan?.id || school.planId,
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
      watermarkRequired,
      exportFormats: normalizedExportFormats,
      plan: effectivePlan ? {
        id: effectivePlan.id,
        name: effectivePlan.name,
        teacherMin: effectivePlan.teacherMin,
        teacherMax: effectivePlan.teacherMax,
        priceMonthly: Number(effectivePlan.priceMonthly),
        reportEnabled: effectivePlan.reportEnabled,
        attendanceEnabled: effectivePlan.attendanceEnabled,
        homeworkEnabled: effectivePlan.homeworkEnabled,
        lessonPlanningEnabled: effectivePlan.lessonPlanningEnabled ?? false,
        exportFormats: normalizedExportFormats,
        watermarkRequired,
      } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

