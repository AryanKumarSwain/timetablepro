import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/custom-plan-requests/[id]/pay - Activate custom plan after Razorpay payment
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireSchoolAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, billingCycle } = body ?? {};

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Razorpay payment details (paymentId, orderId, signature) are required' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay secret is not configured on server' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid Razorpay signature' }, { status: 400 });
    }

    const customRequest = await prisma.customPlanRequest.findUnique({
      where: { id },
      include: { school: true }
    });

    if (!customRequest) {
      return NextResponse.json({ error: 'Custom plan request not found' }, { status: 404 });
    }

    if (customRequest.schoolId !== user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized access to this request' }, { status: 403 });
    }

    if (customRequest.isPaid) {
      return NextResponse.json({ error: 'This custom plan has already been paid and activated' }, { status: 400 });
    }

    if (customRequest.status !== 'APPROVED') {
      return NextResponse.json({ error: 'This request is not approved for payment' }, { status: 400 });
    }

    if (!customRequest.price || Number(customRequest.price) <= 0) {
      return NextResponse.json({ error: 'No approved price found for this request' }, { status: 400 });
    }

    // Determine billing cycle & pricing (Base Price + 18% GST)
    const cycle = (billingCycle === 'annual' || billingCycle === 'yearly') ? 'annual' : 'monthly';
    const durationDays = cycle === 'annual' ? 365 : 30;
    const basePrice = cycle === 'annual'
      ? (customRequest.priceYearly ? Number(customRequest.priceYearly) : Math.round(Number(customRequest.price) * 12 * 0.83))
      : Number(customRequest.price);
    const gstAmount = Math.round(basePrice * 0.18);
    const chargedAmount = basePrice + gstAmount;

    // Find the Elite / top feature plan so school gets all premium capabilities
    let topPlan = await prisma.saaSPlan.findFirst({
      where: {
        OR: [
          { name: { contains: 'elite' } },
          { name: { contains: 'Elite' } },
          { name: { contains: 'ELITE' } }
        ]
      }
    });

    if (!topPlan) {
      topPlan = await prisma.saaSPlan.findFirst({
        orderBy: { teacherMax: 'desc' }
      });
    }

    if (!topPlan) {
      return NextResponse.json({ error: 'No baseline plan available' }, { status: 500 });
    }

    const now = new Date();
    const currentEnd = customRequest.school.planEndsAt ? new Date(customRequest.school.planEndsAt) : null;
    const isRenewal = Boolean(currentEnd && currentEnd > now && customRequest.school.customTeacherLimit);
    const baseDate = isRenewal && currentEnd ? currentEnd : now;
    const planEndsAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      // 1. Mark custom plan request as paid and completed
      prisma.customPlanRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          isPaid: true,
          paidAt: now,
          billingCycle: cycle,
          razorpayOrderId,
          razorpayPaymentId,
        }
      }),

      // 2. Update school with customTeacherLimit, dates, and active plan
      prisma.school.update({
        where: { id: customRequest.schoolId },
        data: {
          customTeacherLimit: customRequest.requestedFacultyLimit,
          planId: topPlan.id,
          licenseStatus: 'ACTIVE',
          planStartsAt: isRenewal ? (customRequest.school.planStartsAt || now) : now,
          planEndsAt: planEndsAt,
          pausedPlanId: null,
          pausedPlanRemainingSeconds: null,
        }
      }),

      // 3. Record transaction in SubscriptionTransaction table
      prisma.subscriptionTransaction.create({
        data: {
          schoolId: customRequest.schoolId,
          planId: topPlan.id,
          amount: chargedAmount.toFixed(2),
          billingCycle: cycle,
          utrNumber: razorpayPaymentId,
          email: user.email || customRequest.school.email || null,
          status: 'APPROVED',
        }
      }),

      // 4. Create in-app celebration notification
      prisma.notification.create({
        data: {
          title: isRenewal ? 'Custom Plan Renewed! 🎉' : 'Custom Plan Activated! 🎉',
          message: `Your custom plan for ${customRequest.requestedFacultyLimit} teachers is now ${isRenewal ? 'extended' : 'active'} on a ${cycle} billing cycle until ${planEndsAt.toLocaleDateString()}. All platform features and exports are enabled.`,
          type: 'INFO',
          scope: 'ALL_ADMINS',
          senderId: user.id,
          schoolId: customRequest.schoolId,
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: `Payment successful! Your custom plan for ${customRequest.requestedFacultyLimit} teachers is now active.`,
      facultyLimit: customRequest.requestedFacultyLimit,
      planName: topPlan.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
