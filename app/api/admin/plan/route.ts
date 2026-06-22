import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function PATCH(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Validate the plan exists
    const plan = await prisma.saaSPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Update school's plan
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        planId,
      },
    });

    return NextResponse.json({ success: true, planId: updatedSchool.planId });
  } catch (error) {
    return handleApiError(error);
  }
}
