import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const user = await requireSchoolAdmin();
    const body = await request.json();

    const { planId, amount, billingCycle, couponCode } = body ?? {};

    if (!planId || !amount || !billingCycle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `plan_${user.schoolId}_${Date.now()}`,
        notes: {
          schoolId: user.schoolId,
          planId,
          billingCycle,
          couponCode: couponCode || '',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.description || 'Failed to create Razorpay order' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      keyId: razorpayKeyId,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create order' }, { status: 500 });
  }
}
