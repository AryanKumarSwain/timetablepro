import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';
import { LicenseStatus } from '@prisma/client';

export async function GET() {
  try {
    await requireSuperAdmin();

    const trialRequests = await prisma.trialRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(trialRequests);
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

    const trialRequest = await prisma.trialRequest.findUnique({
      where: { id: requestId },
    });

    if (!trialRequest) {
      return NextResponse.json({ error: 'Trial request not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      await prisma.$transaction([
        prisma.trialRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' },
        }),
        prisma.school.update({
          where: { id: trialRequest.schoolId },
          data: {
            licenseStatus: LicenseStatus.TRIAL,
            trialEndsAt,
          },
        }),
      ]);

      // TODO: Send email notification to the school
      // This would require an email service integration (e.g., Resend, SendGrid, etc.)
      // For now, we'll log that the email should be sent
      console.log(`[Trial Approval] Email should be sent to ${trialRequest.schoolName} - Trial started, ends at ${trialEndsAt.toISOString()}`);

      return NextResponse.json({ success: true, trialEndsAt });
    } else {
      await prisma.trialRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
