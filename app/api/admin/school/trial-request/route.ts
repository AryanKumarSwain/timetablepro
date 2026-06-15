import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { plan: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Check if school has already used a trial
    if (school.hasUsedTrial) {
      return NextResponse.json(
        { error: 'You have already used your free trial. You can only use a free trial once.' },
        { status: 403 }
      );
    }

    // Check if there's already a pending trial request
    if (school.trialStatus === 'PENDING') {
      return NextResponse.json(
        { error: 'You already have a pending trial request. Please wait for approval.' },
        { status: 409 }
      );
    }

    // Validate the plan exists
    const plan = await prisma.saaSPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Update school with trial request
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        trialPlanId: planId,
        trialStatus: 'PENDING',
        originalPlanId: school.planId,
      },
    });

    return NextResponse.json(
      {
        message: 'Trial request submitted successfully',
        school: updatedSchool,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
