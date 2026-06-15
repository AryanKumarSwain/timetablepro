import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Check if school has already used a trial
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { plan: true },
    }) as any;

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    if (school.hasUsedTrial) {
      return NextResponse.json({ 
        error: 'You have already used a free trial. Trials can only be used once per school.' 
      }, { status: 400 });
    }

    // Check if there's already a pending trial request
    if (school.trialStatus === 'PENDING') {
      return NextResponse.json({ 
        error: 'You already have a pending trial request.' 
      }, { status: 400 });
    }

    // Check if the requested plan exists
    const requestedPlan = await prisma.saaSPlan.findUnique({
      where: { id: planId },
    });

    if (!requestedPlan) {
      return NextResponse.json({ error: 'Requested plan not found' }, { status: 404 });
    }

    // Check if the requested plan is different from current plan
    if (school.planId === planId) {
      return NextResponse.json({ 
        error: 'You are already on this plan.' 
      }, { status: 400 });
    }

    // Create the trial request
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        trialStatus: 'PENDING',
        trialPlanId: planId,
        originalPlanId: school.planId,
      },
    } as any);

    return NextResponse.json({ 
      success: true, 
      message: 'Trial request submitted successfully. Please wait for Super Admin approval.' 
    });
  } catch (error) {
    return handleApiError(error);
  }
}
