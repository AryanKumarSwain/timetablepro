import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

export async function PATCH(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const plan = await prisma.saaSPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { planId },
    });

    return NextResponse.json({
      success: true,
      schoolId: updatedSchool.id,
      planId: updatedSchool.planId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
