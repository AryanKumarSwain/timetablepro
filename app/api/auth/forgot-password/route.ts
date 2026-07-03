import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();

    // Look up user account in global user directory matrix
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    // Security best practice: Don't explicitly reveal if an email doesn't exist to prevent enumeration attacks
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'If the account exists, a secure verification code has been dispatched.' 
      });
    }

    // Generate secure 6-digit numeric verification sequence
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute operational lifecycle

    // Wipe any lingering reset codes for this account
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    });

    // Insert active verification token mapping
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    // Dispatch via your native configuration engine
    const mailResult = await sendVerificationCode(user.email, token);
    if (!mailResult.sent) {
      console.error('[MAIL DISPATCH FAILURE]:', mailResult.error);
      // Do not expose email delivery problems to end users. Return success
      // to keep the endpoint idempotent and prevent leaking SMTP config.
      return NextResponse.json({ 
        success: true, 
        message: 'If the account exists, a secure verification code has been dispatched.' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If the account exists, a secure verification code has been dispatched.' 
    });

  } catch (error) {
    console.error('[POST /api/auth/forgot-password Exception]:', error);
    return NextResponse.json({ error: 'Failed handling password restoration handshake' }, { status: 500 });
  }
}