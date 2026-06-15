import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { trialPlan: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Check if school has an active trial
    if (school.trialStatus !== 'APPROVED' || !school.trialEndsAt) {
      return NextResponse.json({
        isActive: false,
        planName: null,
        hoursRemaining: null,
      });
    }

    const now = new Date();
    const trialEndsAt = new Date(school.trialEndsAt);
    const hoursRemaining = Math.max(0, (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    return NextResponse.json({
      isActive: true,
      planName: school.trialPlan?.name || null,
      hoursRemaining: Math.round(hoursRemaining),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
