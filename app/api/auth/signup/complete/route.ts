import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const fullName = String(body.fullName ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const countryCode = String(body.countryCode ?? '+91').trim();
    const errors: Record<string, string> = {};

    if (!fullName) errors.fullName = 'Full name is required';
    if (!phone) errors.phone = 'Phone number is required';

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: fullName,
        phone,
        countryCode,
      },
    });

    session.user = {
      ...session.user,
      onboardingDone: user.onboardingDone,
    };
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth/signup/complete]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
