import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getRoleRedirectPath } from '@/lib/session';
import bcrypt from 'bcryptjs';

// --- GET: Fetch current user details & format for client state ---
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { user } = session;
  const userEmail = user.email.trim().toLowerCase();
  const userWhere = { email: userEmail };
  let teacherId: string | undefined;
  let phone: string | null = null;
  let countryCode: string | null = null;
  let onboardingDone = true;
  let name = userEmail.split('@')[0];

  if (user.role === 'TEACHER' && user.schoolId) {
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId: user.schoolId, email: user.email },
    });
    teacherId = teacher?.id;
    if (teacher) {
      name = teacher.name;
      phone = teacher.phone || null;
    }
  } else {
    const dbUser = await prisma.user.findUnique({ where: userWhere });
    if (dbUser) {
      name = dbUser.name || name;
      phone = dbUser.phone || null;
      countryCode = dbUser.countryCode || null;
      onboardingDone = dbUser.onboardingDone;
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name,
      phone,
      countryCode,
      onboardingDone,
      role: user.role.toLowerCase().replace('_', '-') as 'super-admin' | 'admin' | 'teacher',
      schoolId: user.schoolId,
      teacherId,
      active: true,
    },
    redirectTo: getRoleRedirectPath(user.role, onboardingDone),
  });
}

// --- PATCH: Multi-flow Account Security Update ---
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized payload exception' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, oldPassword, newPassword, otp } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name parameter is completely mandatory' }, { status: 400 });
    }

    const { user } = session;
    const userEmail = user.email.trim().toLowerCase();
    const userWhere = { email: userEmail };

    const userUpdateData: any = {
      name: name.trim(),
      phone: phone?.trim() || null,
    };

    // --- PASSWORD FLOW CONTROL ---
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password length must be at least 8 characters long' }, { status: 400 });
      }

      if (user.role === 'TEACHER') {
        // FLOW A: TEACHER SECURITY FLOW (REQUIRES OTP)
        if (!otp) {
          return NextResponse.json({ error: 'Verification token missing for Teacher authorization' }, { status: 400 });
        }

        const tokenRecord = await prisma.verificationToken.findFirst({
          where: {
            userId: user.id,
            token: otp,
            type: 'PASSWORD_RESET',
            expiresAt: { gte: new Date() },
          },
        });

        if (!tokenRecord) {
          return NextResponse.json({ error: 'Invalid or expired verification OTP token' }, { status: 400 });
        }

        // Consume used token cleanly
        await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
        userUpdateData.password = await bcrypt.hash(newPassword, 10);

      } else {
        // FLOW B: ADMIN SECURITY FLOW (REQUIRES OLD PASSWORD)
        if (!oldPassword) {
          return NextResponse.json({ error: 'Current password is required for Admin validation' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({ where: userWhere });
        if (!dbUser) return NextResponse.json({ error: 'Profile metadata missing' }, { status: 404 });

        const isMatch = await bcrypt.compare(oldPassword, dbUser.password);
        if (!isMatch) {
          return NextResponse.json({ error: 'The old password you entered is incorrect' }, { status: 400 });
        }

        userUpdateData.password = await bcrypt.hash(newPassword, 10);
      }
    }

    // --- APPLY WRITES TO DATABASE ---
    if (user.role !== 'TEACHER') {
      await prisma.user.update({
        where: userWhere,
        data: userUpdateData,
      });
    } else {
      // Sync teacher profile credentials
      await prisma.user.update({
        where: userWhere,
        data: userUpdateData.password ? { password: userUpdateData.password } : {},
      });

      await prisma.teacher.updateMany({
        where: { schoolId: user.schoolId, email: user.email },
        data: { name: name.trim(), phone: phone?.trim() || null },
      });
    }

    return NextResponse.json({
      id: user.id,
      name: name.trim(),
      email: user.email,
      phone: phone?.trim() || "",
    });
  } catch (error) {
    console.error('[PATCH /api/auth/me Exception]:', error);
    return NextResponse.json({ error: 'Failed saving updated profile modifications' }, { status: 500 });
  }
}