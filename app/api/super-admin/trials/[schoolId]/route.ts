import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    await requireSuperAdmin();
    const { schoolId } = params;
    const body = await request.json();
    const { action } = body; // 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject.' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { trialPlan: true, plan: true },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    if (school.trialStatus !== 'PENDING') {
      return NextResponse.json({ error: 'Trial request is not pending' }, { status: 400 });
    }

    if (action === 'reject') {
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          trialStatus: 'REJECTED',
          trialPlanId: null,
          originalPlanId: null,
        },
      });

      return NextResponse.json({ message: 'Trial request rejected' });
    }

    // Approve the trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7 days from now

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        trialStatus: 'APPROVED',
        trialEndsAt,
        hasUsedTrial: true,
        planId: school.trialPlanId, // Upgrade to the trial plan
        licenseStatus: 'TRIAL',
      },
    });

    return NextResponse.json({ message: 'Trial approved successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
