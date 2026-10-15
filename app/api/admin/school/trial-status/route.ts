import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        trialPlan: true,
        plan: true,
      },
    });

    if (!school) {
      return NextResponse.json({
        isActive: false,
        showWarning: false,
        planName: null,
        hoursRemaining: null,
      });
    }

    const isTrialActive =
      school.trialStatus === 'APPROVED' &&
      school.trialEndsAt !== null &&
      new Date(school.trialEndsAt).getTime() > Date.now();

    const planName = school.trialPlan?.name || school.plan?.name || 'Pro Plan';

    let hoursRemaining = 0;
    if (isTrialActive && school.trialEndsAt) {
      const diffMs = new Date(school.trialEndsAt).getTime() - Date.now();
      hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
    }

    const showWarning = isTrialActive && hoursRemaining <= 48;

    return NextResponse.json({
      isActive: isTrialActive,
      showWarning,
      planName,
      hoursRemaining,
      trialStatus: school.trialStatus,
      trialEndsAt: school.trialEndsAt,
      isTrialEndingSoon: showWarning,
    });
  } catch (error: any) {
    return NextResponse.json({
      isActive: false,
      showWarning: false,
      planName: null,
      hoursRemaining: null,
    });
  }
}
