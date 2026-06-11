import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/mailer';

type FieldErrors = Record<string, string>;

function validateSignupBody(body: unknown): {
  ok: true;
  data: {
    fullName: string;
    email: string;
    phone: string;
    countryCode: string;
    password: string;
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

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
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
      password,
    },
  };
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateSignupBody(body);

    if (!validated.ok) {
      return NextResponse.json(
        { success: false, errors: validated.errors },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      phone,
      countryCode,
      password,
    } = validated.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOtp();

    await prisma.emailVerification.upsert({
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

    const emailResult = await sendVerificationCode(
      email,
      otp
    );

    if (!emailResult.sent) {
      return NextResponse.json(
        {
          success: false,
          errors: {
            email:
              emailResult.error ??
              'Unable to send verification email',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email,
      message:
        'Verification code sent successfully',
    });
  } catch (error) {
    console.error('[auth/signup]', error);

    return NextResponse.json(
      {
        success: false,
        errors: {
          _form:
            'Unable to create account. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}