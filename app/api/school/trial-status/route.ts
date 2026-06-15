import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { trialPlan: true } as any,
    }) as any;

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Check if school is on an active trial
    if (school.trialStatus !== 'APPROVED' || !school.trialEndsAt) {
      return NextResponse.json({ showWarning: false });
    }

    const now = new Date();
    const trialEndsAt = new Date(school.trialEndsAt);
    const hoursRemaining = Math.floor((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Show warning if less than 48 hours remaining (Day 6)
    const showWarning = hoursRemaining <= 48 && hoursRemaining > 0;

    return NextResponse.json({
      showWarning,
      planName: school.trialPlan?.name || 'the selected plan',
      hoursRemaining,
      trialEndsAt: school.trialEndsAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
