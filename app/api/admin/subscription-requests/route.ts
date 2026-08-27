import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

// POST /api/admin/subscription-requests - Activation after successful Razorpay payment
export async function POST(request: NextRequest) {
  try {
    const user = await requireSchoolAdmin();
    const body = await request.json();
    const {
      planId,
      amount,
      billingCycle,
      couponCode,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      mobileNumber,
      state,
      adminEmail,
    } = body;

    if (!planId || !amount || !billingCycle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isRazorpayPayment = Boolean(razorpayPaymentId && razorpayOrderId && razorpaySignature);
    if (!isRazorpayPayment) {
      return NextResponse.json({ error: 'Razorpay payment required for plan activation' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid Razorpay signature' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      include: { plan: true }
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    let couponId: string | null = null;
    if (couponCode && couponCode.trim()) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() }
      });

      if (!coupon) {
        return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
      }

      if (!coupon.isActive) {
        return NextResponse.json({ error: 'Coupon is not active' }, { status: 400 });
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
      }

      if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
        return NextResponse.json({ error: 'Coupon has reached maximum uses' }, { status: 400 });
      }

      couponId = coupon.id;
    }

    const now = new Date();
    const hasActivePlan = Boolean(school.planId && school.planEndsAt && new Date(school.planEndsAt) > now);
    const newPlanStartsAt = now;
    const newPlanEndsAt = billingCycle === 'annual'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    await prisma.$transaction([
      prisma.subscriptionTransaction.create({
        data: {
          schoolId: school.id,
          planId,
          amount: Number(amount).toFixed(2),
          billingCycle,
          utrNumber: razorpayPaymentId,
          phoneNumber: mobileNumber || null,
          email: adminEmail || school.email || null,
          couponId,
          status: 'APPROVED',
        }
      }),

      prisma.school.update({
        where: { id: school.id },
        data: hasActivePlan
          ? {
              planId,
              planStartsAt: newPlanStartsAt,
              planEndsAt: newPlanEndsAt,
              queuedPlanId: null,
              queuedPlanStartsAt: null,
              pausedPlanId: school.planId,
              pausedPlanRemainingSeconds: Math.max(0, Math.floor((new Date(school.planEndsAt as Date).getTime() - now.getTime()) / 1000)),
              licenseStatus: 'ACTIVE',
            }
          : {
              planId,
              planStartsAt: newPlanStartsAt,
              planEndsAt: newPlanEndsAt,
              queuedPlanId: null,
              queuedPlanStartsAt: null,
              pausedPlanId: null,
              pausedPlanRemainingSeconds: null,
              licenseStatus: 'ACTIVE',
            }
      }),

      ...(couponId ? [
        prisma.coupon.update({
          where: { id: couponId },
          data: { currentUses: { increment: 1 } }
        })
      ] : []),

      prisma.notification.create({
        data: {
          title: hasActivePlan ? 'Plan Swapped Successfully' : 'Plan Activated',
          message: hasActivePlan
            ? `${school.name} upgraded to the new ${billingCycle} plan immediately. The previous plan has been saved in queue and will resume after the current plan ends.`
            : `${school.name} has successfully activated the ${billingCycle} ${planId} plan via Razorpay.`,
          type: 'INFO',
          scope: 'SCHOOL_TEACHERS',
          senderId: user.id,
          schoolId: school.id,
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment successful and plan activated',
      paymentId: razorpayPaymentId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

