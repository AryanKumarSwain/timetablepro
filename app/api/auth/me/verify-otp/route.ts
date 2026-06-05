import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const otp = String(body.otp ?? '').trim();
    const newPassword = String(body.newPassword ?? '');

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const resolvedUser = await prisma.user.findUnique({ where: { email: session.user.email.trim().toLowerCase() } });
    const userId = session.user.id || resolvedUser?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        userId,
        token: otp,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: 'OTP invalid or expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.verificationToken.deleteMany({ where: { userId } });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[POST /api/auth/me/verify-otp]', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
