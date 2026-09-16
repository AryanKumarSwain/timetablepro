import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

// POST /api/admin/custom-plan-requests/renew - Initiate renewal of custom plan
export async function POST(request: NextRequest) {
  try {
    const user = await requireSchoolAdmin();

    // Check if there is already an approved unpaid request
    const existingApproved = await prisma.customPlanRequest.findFirst({
      where: {
        schoolId: user.schoolId,
        status: 'APPROVED',
        isPaid: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingApproved) {
      const priceMonthly = Number(existingApproved.price || 0);
      const priceYearly = existingApproved.priceYearly
        ? Number(existingApproved.priceYearly)
        : Math.round(priceMonthly * 12 * 0.83);

      return NextResponse.json({
        success: true,
        request: {
          id: existingApproved.id,
          requestedFacultyLimit: existingApproved.requestedFacultyLimit,
          price: priceMonthly,
          priceYearly: priceYearly,
          status: existingApproved.status,
        }
      });
    }

    // Find the latest completed custom plan for this school
    const lastPlan = await prisma.customPlanRequest.findFirst({
      where: {
        schoolId: user.schoolId,
        status: 'COMPLETED',
        isPaid: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    // Also check school.customTeacherLimit as fallback
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { customTeacherLimit: true, name: true }
    });

    if (!lastPlan && !school?.customTeacherLimit) {
      return NextResponse.json(
        { error: 'No custom plan on file to renew. Please request a custom enterprise plan first.' },
        { status: 400 }
      );
    }

    const facultyLimit = lastPlan?.requestedFacultyLimit || school?.customTeacherLimit || 100;
    const priceMonthly = lastPlan?.price ? Number(lastPlan.price) : 500;
    const priceYearly = lastPlan?.priceYearly
      ? Number(lastPlan.priceYearly)
      : Math.round(priceMonthly * 12 * 0.83);

    // Create a new pre-approved custom plan request for renewal
    const renewalRequest = await prisma.customPlanRequest.create({
      data: {
        schoolId: user.schoolId,
        requestedFacultyLimit: facultyLimit,
        price: priceMonthly.toFixed(2),
        priceYearly: priceYearly.toFixed(2),
        status: 'APPROVED',
        isPaid: false,
      }
    });

    return NextResponse.json({
      success: true,
      request: {
        id: renewalRequest.id,
        requestedFacultyLimit: renewalRequest.requestedFacultyLimit,
        price: priceMonthly,
        priceYearly: priceYearly,
        status: renewalRequest.status,
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
