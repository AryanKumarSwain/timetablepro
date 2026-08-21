import { prisma } from './prisma';

/**
 * Checks if a school's current plan has expired.
 * If expired:
 * 1. Resumes any paused plan (queued plan) preserving remaining seconds.
 * 2. Or activates an explicit queued plan if available.
 * 3. Or falls back to the default Free plan (teacher limit 5).
 */
export async function checkAndUpdateSchoolPlanExpiry(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      plan: true,
      queuedPlan: true,
      pausedPlan: true,
    },
  });

  if (!school) return null;

  // Free plan or no plan end date means plan does not expire automatically
  if (!school.planEndsAt) return school;

  const now = new Date();
  if (new Date(school.planEndsAt) >= now) {
    return school;
  }

  // Plan is EXPIRED. Get admin users for notifications
  const adminUsers = await prisma.user.findMany({
    where: {
      schoolId: school.id,
      role: 'ADMIN',
    },
  });

  // 1. Check if there is a paused plan to resume
  if (school.pausedPlanId && school.pausedPlanRemainingSeconds) {
    const resumeStartsAt = new Date();
    const resumeEndsAt = new Date(resumeStartsAt.getTime() + Number(school.pausedPlanRemainingSeconds) * 1000);

    const updated = await prisma.school.update({
      where: { id: school.id },
      data: {
        planId: school.pausedPlanId,
        planStartsAt: resumeStartsAt,
        planEndsAt: resumeEndsAt,
        pausedPlanId: null,
        pausedPlanRemainingSeconds: null,
        licenseStatus: 'ACTIVE',
      },
      include: {
        plan: true,
        queuedPlan: true,
        pausedPlan: true,
      },
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          title: 'Plan Resumed from Queue',
          message: `Your previous plan (${school.pausedPlan?.name || 'Plan'}) has been resumed automatically for the remaining duration.`,
          type: 'INFO',
          scope: 'SCHOOL_TEACHERS',
          schoolId: school.id,
          senderId: admin.id,
        },
      });
    }

    console.log(`[Plan Expiry Helper] Resumed paused plan ${school.pausedPlan?.name} for school ${school.name}`);
    return updated;
  }

  // 2. Check if there is an explicit queued plan
  if (school.queuedPlanId && school.queuedPlanStartsAt) {
    let queuedPlanEndsAt = new Date(school.queuedPlanStartsAt);
    if (process.env.NODE_ENV !== 'production') {
      queuedPlanEndsAt = new Date(now.getTime() + 5 * 60 * 1000);
    } else {
      queuedPlanEndsAt.setMonth(queuedPlanEndsAt.getMonth() + 1);
    }

    const updated = await prisma.school.update({
      where: { id: school.id },
      data: {
        planId: school.queuedPlanId,
        planStartsAt: now,
        planEndsAt: queuedPlanEndsAt,
        queuedPlanId: null,
        queuedPlanStartsAt: null,
        licenseStatus: 'ACTIVE',
      },
      include: {
        plan: true,
        queuedPlan: true,
        pausedPlan: true,
      },
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          title: 'Queued Plan Activated',
          message: `Your queued plan (${school.queuedPlan?.name || 'Plan'}) has been activated.`,
          type: 'INFO',
          scope: 'SCHOOL_TEACHERS',
          schoolId: school.id,
          senderId: admin.id,
        },
      });
    }

    console.log(`[Plan Expiry Helper] Activated queued plan ${school.queuedPlan?.name} for school ${school.name}`);
    return updated;
  }

  // 3. Fallback to Free Plan (Base plan, permanent, max 5 teachers)
  let freePlan = await prisma.saaSPlan.findFirst({
    where: { name: 'Free' },
  });

  if (!freePlan) {
    freePlan = await prisma.saaSPlan.create({
      data: {
        id: 'free-plan-default',
        name: 'Free',
        teacherMin: 0,
        teacherMax: 5,
        priceMonthly: 0,
        reportEnabled: false,
        attendanceEnabled: false,
        homeworkEnabled: false,
        lessonPlanningEnabled: false,
        exportFormats: ['pdf'],
        watermarkRequired: true,
      },
    });
  }

  const updated = await prisma.school.update({
    where: { id: school.id },
    data: {
      planId: freePlan.id,
      planStartsAt: null,
      planEndsAt: null,
      autoDowngradedAt: new Date(),
      licenseStatus: 'ACTIVE',
    },
    include: {
      plan: true,
      queuedPlan: true,
      pausedPlan: true,
    },
  });

  for (const admin of adminUsers) {
    // Use INFO type for automatic downgrades to avoid triggering intrusive alert pop-ups
    await prisma.notification.create({
      data: {
        title: 'Plan Expired - Switched to Free Plan',
        message: `Your paid plan (${school.plan?.name || 'Plan'}) has expired. Your school has been switched to the Free plan (Max 5 teachers).`,
        type: 'INFO',
        scope: 'SCHOOL_TEACHERS',
        schoolId: school.id,
        senderId: admin.id,
      },
    });
  }

  console.log(`[Plan Expiry Helper] Switched school ${school.name} to Free plan`);
  return updated;
}
