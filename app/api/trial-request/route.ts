import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const adminData = await requireSchoolAdmin();
    const { schoolId } = adminData;

    const body = await request.json();
    const { reason, instituteName, contactNo, email, planId } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }
    if (!instituteName || !contactNo || !email || !planId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const plan = await prisma.saaSPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const existingRequest = await prisma.trialRequest.findFirst({
      where: {
        schoolId: schoolId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending trial request' }, { status: 409 });
    }

    const trialRequest = await prisma.trialRequest.create({
      data: {
        schoolId: schoolId,
        schoolName: instituteName || school.name,
        contactName: adminData.name || 'Admin',
        phone: contactNo,
        expectedFaculty: plan.teacherMax,
        planId: planId,
        status: 'PENDING',
      },
    });

    // Also update the school's trialStatus to PENDING so it shows up in super-admin
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        trialStatus: 'PENDING',
        trialPlanId: planId,
        originalPlanId: school.planId,
      },
    } as any);

    // Create notification for super admin about trial request
    await prisma.notification.create({
      data: {
        title: 'Trial Request',
        message: `${school.name} has requested a trial for the ${plan.name} plan.`,
        type: 'SYSTEM',
        scope: 'ALL_ADMINS',
        schoolId: school.id,
        senderId: adminData.id,
      },
    });

    return NextResponse.json(trialRequest, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
