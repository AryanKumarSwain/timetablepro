import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/mailer';

export async function POST() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = session;
    const userEmail = user.email.trim().toLowerCase();
    const resolvedUser = await prisma.user.findUnique({ where: { email: userEmail } });
    const userId = user.id || resolvedUser?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { userId, type: 'PASSWORD_RESET' },
    });

    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    const sendResult = await sendVerificationCode(user.email, token);
    if (!sendResult.sent) {
      return NextResponse.json({ error: sendResult.error || 'Failed to send verification code' }, { status: 500 });
    }

    return NextResponse.json({ message: 'A 6-digit secure processing token was dispatched to your mail.' });
  } catch (error) {
    console.error('[POST /api/auth/me/send-otp]', error);
    return NextResponse.json({ error: 'Failed routing security sequence validation tokens' }, { status: 500 });
  }
}