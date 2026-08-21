import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint should be called daily by a cron job
// It checks for expired paid plans and handles plan queueing or fallback to free plan
export async function GET(request: NextRequest) {
  try {
    // Verify this is called from cron (you can add authentication here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      plansExpired: 0,
      plansQueued: 0,
      plansSwitchedToFree: 0,
      errors: [] as string[],
    };

    // Check for expired paid plans (planEndsAt is in the past)
    const expiredSchools = await prisma.school.findMany({
      where: {
        planId: { not: null },
        planEndsAt: {
          lt: now,
        },
        trialStatus: 'NONE', // Only process regular plans, not trials
      },
      include: { plan: true, queuedPlan: true },
    } as any);

    // Process expired plans
    for (const school of expiredSchools as any[]) {
      try {
        // Get admin users for notifications
        const adminUsers = await prisma.user.findMany({
          where: {
            schoolId: school.id,
            role: 'ADMIN',
          },
        });

        if (school.pausedPlanId && school.pausedPlanRemainingSeconds) {
          // Resume paused plan preserving remaining seconds
          const nowStart = new Date();
          const resumeEndsAt = new Date(nowStart.getTime() + Number(school.pausedPlanRemainingSeconds) * 1000);

          await prisma.school.update({
            where: { id: school.id },
            data: {
              planId: school.pausedPlanId,
              planStartsAt: nowStart,
              planEndsAt: resumeEndsAt,
              pausedPlanId: null,
              pausedPlanRemainingSeconds: null,
              licenseStatus: 'ACTIVE',
            },
          } as any);

          // Notify admins
          for (const admin of adminUsers) {
            await prisma.notification.create({
              data: {
                title: 'Plan Resumed',
                message: `Your previous plan (${school.pausedPlan?.name || 'Plan'}) has been resumed for the remaining duration after your newer plan ended.`,
                type: 'INFO',
                scope: 'SCHOOL_TEACHERS',
                schoolId: school.id,
                senderId: admin.id,
              },
            });
          }

          results.plansQueued++;
          console.log(`[Plan Expiration] Resumed paused plan for ${school.name}`);
        } else if (school.queuedPlanId && school.queuedPlanStartsAt) {
          // Activate queued plan (legacy behavior)
          let queuedPlanEndsAt = new Date(school.queuedPlanStartsAt);
          // In development, use short (5 minute) queued plan duration for testing
          if (process.env.NODE_ENV !== 'production') {
            queuedPlanEndsAt = new Date(new Date(school.queuedPlanStartsAt).getTime() + 5 * 60 * 1000);
          } else {
            // Default to 1 month for queued plan in production
            queuedPlanEndsAt.setMonth(queuedPlanEndsAt.getMonth() + 1);
          }

          await prisma.school.update({
            where: { id: school.id },
            data: {
              planId: school.queuedPlanId,
              planStartsAt: school.queuedPlanStartsAt,
              planEndsAt: queuedPlanEndsAt,
              queuedPlanId: null,
              queuedPlanStartsAt: null,
              licenseStatus: 'ACTIVE',
            },
          } as any);

          // Notify admins
          for (const admin of adminUsers) {
            await prisma.notification.create({
              data: {
                title: 'Plan Activated',
                message: `Your queued plan (${school.queuedPlan?.name || 'Plan'}) has been activated automatically after your previous plan expired.`,
                type: 'INFO',
                scope: 'SCHOOL_TEACHERS',
                schoolId: school.id,
                senderId: admin.id,
              },
            });
          }

          results.plansQueued++;
          console.log(`[Plan Expiration] Activated queued plan for ${school.name}`);
        } else {
          // Switch to free plan
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
                exportFormats: [],
                watermarkRequired: true,
              },
            });
          }

          await prisma.school.update({
            where: { id: school.id },
            data: {
              planId: freePlan.id,
              planStartsAt: null,
              planEndsAt: null,
              licenseStatus: 'ACTIVE',
            },
          } as any);

          // Notify admins
          for (const admin of adminUsers) {
            await prisma.notification.create({
              data: {
                title: 'Plan Expired',
                message: `Your paid plan (${school.plan?.name || 'Plan'}) has expired. Your school has been switched to the Free plan. Upgrade now to continue using premium features.`,
                type: 'ALERT',
                scope: 'SCHOOL_TEACHERS',
                schoolId: school.id,
                senderId: admin.id,
              },
            });
          }

          results.plansSwitchedToFree++;
          console.log(`[Plan Expiration] Switched ${school.name} to free plan`);
        }

        results.plansExpired++;
      } catch (error) {
        const errorMsg = `Failed to process expired plan for ${school.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Additionally, switch schools with zero teachers to Free plan
    // This covers cases where a school has no teachers and should not be billed
    const schoolsWithPlans = await prisma.school.findMany({
      where: {
        planId: { not: null },
        trialStatus: 'NONE',
      },
      include: { plan: true },
    } as any);

    for (const school of schoolsWithPlans as any[]) {
      try {
        const teacherCount = await prisma.teacher.count({ where: { schoolId: school.id } });
        if (teacherCount === 0 && school.plan && Number(school.plan.priceMonthly) > 0) {
          // ensure Free plan exists
          let freePlan = await prisma.saaSPlan.findFirst({ where: { name: 'Free' } });
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
                exportFormats: [],
                watermarkRequired: true,
              },
            });
          }

          await prisma.school.update({
            where: { id: school.id },
            data: {
              planId: freePlan.id,
              planStartsAt: null,
              planEndsAt: null,
              licenseStatus: 'ACTIVE',
            },
          } as any);

          // Notify admins
          const adminUsers = await prisma.user.findMany({ where: { schoolId: school.id, role: 'ADMIN' } });
          for (const admin of adminUsers) {
            await prisma.notification.create({
              data: {
                title: 'Plan Updated',
                message: `Your school had no teachers and has been switched to the Free plan. Add teachers to re-enable paid plan features.`,
                type: 'ALERT',
                scope: 'SCHOOL_TEACHERS',
                schoolId: school.id,
                senderId: admin.id,
              },
            });
          }

          results.plansSwitchedToFree++;
          console.log(`[Plan Expiration] Switched ${school.name} to free plan due to 0 teachers`);
        }
      } catch (error) {
        const errorMsg = `Failed to process zero-teacher switch for ${school.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Plan Expiration Check] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
