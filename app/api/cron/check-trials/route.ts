import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint should be called by a cron job daily to check trial status
// It will:
// 1. Send notifications for trials ending in 48 hours (Day 6)
// 2. Expire trials that have ended and revert schools to their original plan

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Check for trials ending in 48 hours (Day 6) that haven't been notified
    const trialsEndingSoon = await prisma.school.findMany({
      where: {
        trialStatus: 'APPROVED',
        trialEndsAt: {
          lte: fortyEightHoursFromNow,
          gt: now,
        },
        hasNotifiedTrialEnding: false,
      },
      include: {
        trialPlan: true,
      },
    });

    // Send notifications for trials ending soon
    for (const school of trialsEndingSoon) {
      await prisma.notification.create({
        data: {
          title: 'Trial Ending Soon',
          message: `Your 7-day trial for the ${school.trialPlan?.name} plan is ending in less than 48 hours! Upgrade now to keep your advanced features.`,
          type: 'ALERT',
          scope: 'SCHOOL_TEACHERS',
          schoolId: school.id,
          senderId: 'system',
        },
      });

      await prisma.school.update({
        where: { id: school.id },
        data: { hasNotifiedTrialEnding: true },
      });
    }

    // Check for expired trials
    const expiredTrials = await prisma.school.findMany({
      where: {
        trialStatus: 'APPROVED',
        trialEndsAt: {
          lt: now,
        },
      },
      include: {
        originalPlan: true,
      },
    });

    // Expire trials and revert to original plan
    for (const school of expiredTrials) {
      await prisma.school.update({
        where: { id: school.id },
        data: {
          trialStatus: 'EXPIRED',
          planId: school.originalPlanId,
          planStartsAt: null,
          planEndsAt: null,
          licenseStatus: 'TRAIL_EXPIRED',
          trialPlanId: null,
          originalPlanId: null,
        },
      });

      await prisma.notification.create({
        data: {
          title: 'Trial Ended',
          message: 'Your 7-day trial has ended. Your school has been reverted to your original plan. Upgrade now to continue using advanced features.',
          type: 'ALERT',
          scope: 'SCHOOL_TEACHERS',
          schoolId: school.id,
          senderId: 'system',
        },
      });
    }

    return NextResponse.json({
      message: 'Trial check completed',
      trialsEndingSoon: trialsEndingSoon.length,
      expiredTrials: expiredTrials.length,
    });
  } catch (error) {
    console.error('Error checking trials:', error);
    return NextResponse.json({ error: 'Failed to check trials' }, { status: 500 });
  }
}
