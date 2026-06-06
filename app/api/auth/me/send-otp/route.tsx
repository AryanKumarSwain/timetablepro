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

    // --- SECURITY FILTER: ONLY ALLOW TEACHERS TO REQUEST OTPs ---
    if (user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Administrative profiles update credentials directly. OTP routing forbidden.' }, 
        { status: 403 }
      );
    }

    const userEmail = user.email.trim().toLowerCase();
    const resolvedUser = await prisma.user.findUnique({ where: { email: userEmail } });
    const userId = user.id || resolvedUser?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized profile reference mapping exception' }, { status: 401 });
    }

    // Generate secure simple 6-digit numeric sequence string
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute operational lifespan

    // Clear obsolete token rows for this specific target user ID cleanly
    await prisma.verificationToken.deleteMany({
      where: { userId, type: 'PASSWORD_RESET' },
    });

    // Write new activation verification state records down to MySQL storage
    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    // Dispatch using your native custom mailing utility configuration engine
    const sendResult = await sendVerificationCode(user.email, token);
    if (!sendResult.sent) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to dispatch verification email securely' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'A 6-digit secure processing token was dispatched to your registered email address successfully.' 
    });
  } catch (error) {
    console.error('[POST /api/auth/me/send-otp Exception]:', error);
    return NextResponse.json({ error: 'Failed routing security sequence validation tokens' }, { status: 500 });
  }
}