import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';
import { LicenseStatus } from '@prisma/client';

export async function GET() {
  try {
    await requireSuperAdmin();

    // Get schools with pending trial requests
    const trialRequests = await prisma.school.findMany({
      where: { trialStatus: 'PENDING' } as any,
      include: { 
        plan: true,
        trialPlan: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match expected format
    const formattedRequests = trialRequests.map((school: any) => ({
      id: school.id,
      schoolId: school.id,
      schoolName: school.name,
      contactName: school.name, // Using school name as contact name for now
      phone: 'N/A', // Phone not available in School model
      expectedFaculty: 0, // Not available in School model
      planId: school.trialPlanId,
      status: school.trialStatus,
      createdAt: school.createdAt,
      updatedAt: school.createdAt,
      trialPlanName: school.trialPlan?.name || null,
      currentPlanName: school.plan?.name || null,
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: requestId },
      include: { plan: true, trialPlan: true } as any,
    }) as any;

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    if (school.trialStatus !== 'PENDING') {
      return NextResponse.json({ error: 'Trial request is not pending' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      await prisma.school.update({
        where: { id: requestId },
        data: {
          trialStatus: 'APPROVED',
          trialEndsAt,
          hasUsedTrial: true,
          planId: school.trialPlanId, // Upgrade to the trial plan
          licenseStatus: LicenseStatus.TRIAL,
          hasNotifiedTrialEnding: false,
        },
      } as any);

      // TODO: Send email notification to the school
      console.log(`[Trial Approval] Trial approved for ${school.name} - Trial ends at ${trialEndsAt.toISOString()}`);

      return NextResponse.json({ success: true, trialEndsAt });
    } else {
      await prisma.school.update({
        where: { id: requestId },
        data: {
          trialStatus: 'REJECTED',
          trialPlanId: null,
          originalPlanId: null,
        },
      } as any);

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
