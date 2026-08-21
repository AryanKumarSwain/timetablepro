import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();

    const otp = String(body.otp ?? '').trim();

    if (!email || !otp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and verification code are required',
        },
        { status: 400 }
      );
    }

    // 1. Edge Case Prevention: Check if account already exists BEFORE handling OTP consumption logic
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Cleanup any dangling verification data if user already managed to register
      await prisma.emailVerification.deleteMany({ where: { email } }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          error: 'Account already exists with this email address',
        },
        { status: 409 }
      );
    }

    // 2. Fetch the staged temporary verification workflow credentials
    const verification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Verification request not found. Please sign up again.',
        },
        { status: 404 }
      );
    }

    // 3. Expiration checks
    if (verification.expiresAt < new Date()) {
      await prisma.emailVerification.delete({
        where: { email },
      }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          error: 'Verification code expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // 4. Identity pattern string mapping checks
    if (verification.otp !== otp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid verification code',
        },
        { status: 400 }
      );
    }

    // 5. Permanent schema data injection inside your main user tables
    const user = await prisma.user.create({
      data: {
        email: verification.email,
        name: verification.fullName,
        phone: verification.phone,
        countryCode: verification.countryCode,
        password: verification.password, // Assumed to be safely pre-hashed inside step 1 trigger
        role: 'ADMIN',
        onboardingDone: false,
      },
    });

    // Ensure the new account is associated with a School and the default Free plan
    // so users never end up in a "No Plan" state.
    let freePlan = await prisma.saaSPlan.findFirst({ where: { name: 'Free' } });

    if (!freePlan) {
      freePlan = await prisma.saaSPlan.create({
        data: {
          id: 'free-plan-default',
          name: 'Free',
          teacherMin: 0,
          teacherMax: 5,
          priceMonthly: 0,
          reportEnabled: false,
          attendanceEnabled: false,
          homeworkEnabled: false,
          lessonPlanningEnabled: false,
          exportFormats: [],
          watermarkRequired: true,
        },
      });
    }

    const school = await prisma.school.create({
      data: {
        name: `${user.name || 'My'} School`,
        licenseStatus: 'ACTIVE',
        planId: freePlan.id,
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { schoolId: school.id } });

    // 6. Instantly destroy cache footprint
    await prisma.emailVerification.delete({
      where: { email },
    }).catch(() => {});

    // 7. Secure cookie/session configuration management
    const session = await getSession();

    session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: (school as any).id || null,
      onboardingDone: false,
    };

    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error: any) {
    console.error('[auth/verify-email]', error);

    // Prisma specific handling for safe deployment
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Email or phone identification collision occurs.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify email due to an internal execution crash.',
      },
      { status: 500 }
    );
  }
}