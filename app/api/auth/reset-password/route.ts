import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'All parameters are completely mandatory' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: targetEmail } });

    if (!user) {
      return NextResponse.json({ error: 'Invalid profile operation request mapping' }, { status: 400 });
    }

    // Look for a matching valid token record
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        token: otp.trim(),
        type: 'PASSWORD_RESET',
        expiresAt: { gte: new Date() },
      },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: 'The verification code is incorrect or has expired' }, { status: 400 });
    }

    // Atomic database commit sequence
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      // 1. Update user password
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword },
      }),
      // 2. Erase token tracking row completely
      prisma.verificationToken.delete({
        where: { id: tokenRecord.id },
      })
    ]);

    return NextResponse.json({ success: true, message: 'Password has been updated successfully' });

  } catch (error) {
    console.error('[POST /api/auth/reset-password Exception]:', error);
    return NextResponse.json({ error: 'Internal structural write failure updating target credentials' }, { status: 500 });
  }
}