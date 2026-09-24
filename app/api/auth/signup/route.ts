import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/mailer';
import { getSession } from '@/lib/session';

type FieldErrors = Record<string, string>;

function validateSignupBody(body: unknown, allowOptionalPassword = false): {
  ok: true;
  data: {
    fullName: string;
    email: string;
    phone: string;
    countryCode: string;
    password?: string;
  };
} | { ok: false; errors: FieldErrors } {
  const raw = body as Record<string, unknown>;
  const errors: FieldErrors = {};

  const fullName = String(raw.fullName ?? '').trim();
  const email = String(raw.email ?? '').trim().toLowerCase();
  const phone = String(raw.phone ?? '').trim();
  const countryCode = String(raw.countryCode ?? '+91').trim();
  const password = String(raw.password ?? '');

  if (!fullName) errors.fullName = 'Full name is required';

  if (!email) {
    errors.email = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!phone) errors.phone = 'Phone number is required';

  if (!allowOptionalPassword || password) {
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      fullName,
      email,
      phone,
      countryCode,
      password: password || undefined,
    },
  };
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = body as Record<string, unknown>;
    const email = String(raw.email ?? '').trim().toLowerCase();

    // Check if user already exists in permanent records
    const existingUser = email
      ? await prisma.user.findUnique({
          where: { email },
        })
      : null;

    if (existingUser) {
      // If user has already completed onboarding, block duplicate registration
      if (existingUser.onboardingDone) {
        return NextResponse.json(
          {
            success: false,
            errors: {
              email: 'An account with this email already exists',
            },
          },
          { status: 409 }
        );
      }

      // If user exists but onboarding is NOT completed, they navigated back
      // to step 1 to update their Name, Phone, or Password.
      const validated = validateSignupBody(body, true);
      if (!validated.ok) {
        return NextResponse.json(
          { success: false, errors: validated.errors },
          { status: 400 }
        );
      }

      const { fullName, phone, countryCode, password } = validated.data;
      const updateData: any = {
        name: fullName,
        phone,
        countryCode,
      };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
      });

      // Ensure session is set up
      const session = await getSession();
      session.user = {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        schoolId: updatedUser.schoolId,
        onboardingDone: false,
      };
      session.isLoggedIn = true;
      await session.save();

      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        email,
        message: 'Details updated successfully',
      });
    }

    const validated = validateSignupBody(body, false);
    if (!validated.ok) {
      return NextResponse.json(
        { success: false, errors: validated.errors },
        { status: 400 }
      );
    }

    const {
      fullName,
      phone,
      countryCode,
      password,
    } = validated.data;

    const hashedPassword = await bcrypt.hash(password!, 10);
    const otp = generateOtp();

    // 💡 FIX: Accessing Prisma client properties conditionally to avoid 'undefined' crashes.
    // This safely resolves the correct model name mapping dynamically.
    const verificationModel = 
      (prisma as any).emailVerification || 
      (prisma as any).email_verification || 
      (prisma as any).emailVerifications;

    if (!verificationModel) {
      throw new Error(
        "Could not discover an explicit matching 'EmailVerification' model definition inside your current prisma schema client context properties."
      );
    }

    await verificationModel.upsert({
      where: {
        email,
      },
      update: {
        fullName,
        phone,
        countryCode,
        password: hashedPassword,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      create: {
        email,
        fullName,
        phone,
        countryCode,
        password: hashedPassword,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const emailResult = await sendVerificationCode(email, otp);

    if (!emailResult.sent) {
      return NextResponse.json(
        {
          success: false,
          errors: {
            email: emailResult.error ?? 'Unable to send verification email',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email,
      message: 'Verification code sent successfully',
    });
  } catch (error) {
    console.error('[auth/signup]', error);

    return NextResponse.json(
      {
        success: false,
        errors: {
          _form: 'Unable to create account. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}