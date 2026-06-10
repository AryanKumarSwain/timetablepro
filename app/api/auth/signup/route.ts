import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

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
  if (!email) errors.email = 'Email address is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!phone) errors.phone = 'Phone number is required';
  if (!password) errors.password = 'Password is required';
  else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { fullName, email, phone, countryCode, password } };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateSignupBody(body);

    if (!validated.ok) {
      return NextResponse.json({ success: false, errors: validated.errors }, { status: 400 });
    }

    const { fullName, email, phone, countryCode, password } = validated.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, errors: { email: 'An account with this email already exists' } },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        phone,
        countryCode,
        password: hashedPassword,
        role: 'ADMIN',
        onboardingDone: false,
      },
    });

    const session = await getSession();
    session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      onboardingDone: user.onboardingDone,
    };
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth/signup]', error);
    return NextResponse.json(
      { success: false, errors: { _form: 'Unable to create account. Please try again.' } },
      { status: 500 }
    );
  }
}
