import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LicenseStatus } from '@prisma/client';

// This endpoint should be called daily by a cron job
// It checks for trials that are ending soon (Day 6) or have expired
export async function GET(request: NextRequest) {
  try {
    // Verify this is called from cron (you can add authentication here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      warningsSent: 0,
      trialsExpired: 0,
      errors: [] as string[],
    };

    // Check for trials ending in less than 48 hours (Day 6)
    // Trial started 5-6 days ago
    const day5Start = new Date(now);
    day5Start.setDate(day5Start.getDate() - 6);
    
    const day6End = new Date(now);
    day6End.setDate(day6End.getDate() - 5);

    const endingSoonSchools = await prisma.school.findMany({
      where: {
        trialStatus: 'APPROVED',
        trialEndsAt: {
          gte: day5Start,
          lte: day6End,
        },
        hasNotifiedTrialEnding: false,
        // Exclude schools that have an active paid plan (planEndsAt is in the future)
        OR: [
          { planEndsAt: null },
          { planEndsAt: { lt: now } },
        ],
      },
      include: { trialPlan: true, originalPlan: true },
    } as any);

    // Send warning notifications for trials ending soon
    for (const school of endingSoonSchools as any[]) {
      try {
        // Create a notification for the school admin
        const adminUsers = await prisma.user.findMany({
          where: {
            schoolId: school.id,
            role: 'ADMIN',
          },
        });

        for (const admin of adminUsers) {
          await prisma.notification.create({
            data: {
              title: 'Trial Ending Soon',
              message: `Your 7-day trial for ${school.trialPlan?.name || 'the selected plan'} is ending in less than 48 hours! Upgrade now to keep features.`,
              type: 'ALERT',
              scope: 'SCHOOL_TEACHERS',
              schoolId: school.id,
              senderId: admin.id,
            },
          });
        }

        // Mark that we've sent the notification
        await prisma.school.update({
          where: { id: school.id },
          data: { hasNotifiedTrialEnding: true },
        } as any);

        results.warningsSent++;
        console.log(`[Trial Warning] Sent warning to ${school.name} for trial ending soon`);
      } catch (error) {
        const errorMsg = `Failed to send warning to ${school.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Check for expired trials (trialEndsAt is in the past)
    const expiredSchools = await prisma.school.findMany({
      where: {
        trialStatus: 'APPROVED',
        trialEndsAt: {
          lt: now,
        },
      },
      include: { trialPlan: true, originalPlan: true },
    } as any);

    // Expire trials and downgrade schools
    for (const school of expiredSchools as any[]) {
      try {
        // Create expiration notification
        const adminUsers = await prisma.user.findMany({
          where: {
            schoolId: school.id,
            role: 'ADMIN',
          },
        });

        for (const admin of adminUsers) {
          await prisma.notification.create({
            data: {
              title: 'Trial Expired',
              message: `Your 7-day trial for ${school.trialPlan?.name || 'the selected plan'} has expired. Your school has been downgraded to ${school.originalPlan?.name || 'your original plan'}.`,
              type: 'ALERT',
              scope: 'SCHOOL_TEACHERS',
              schoolId: school.id,
              senderId: admin.id,
            },
          });
        }

        // Downgrade the school back to original plan
        await prisma.school.update({
          where: { id: school.id },
          data: {
            trialStatus: 'EXPIRED',
            trialEndsAt: null,
            planId: school.originalPlanId, // Revert to original plan
            licenseStatus: LicenseStatus.ACTIVE,
            trialPlanId: null,
            originalPlanId: null,
            hasNotifiedTrialEnding: false,
          },
        } as any);

        results.trialsExpired++;
        console.log(`[Trial Expiration] Expired trial for ${school.name} and downgraded to original plan`);
      } catch (error) {
        const errorMsg = `Failed to expire trial for ${school.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
    console.error('[Trial Check] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
