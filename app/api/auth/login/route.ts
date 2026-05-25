import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, getRoleRedirectPath } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const session = await getSession();
    session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };
    session.isLoggedIn = true;
    await session.save();

    let teacherId: string | undefined;
    if (user.role === 'TEACHER' && user.schoolId) {
      const teacher = await prisma.teacher.findFirst({
        where: { schoolId: user.schoolId, email: user.email },
      });
      teacherId = teacher?.id;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0],
        role: user.role.toLowerCase().replace('_', '-') as 'super-admin' | 'admin' | 'teacher',
        schoolId: user.schoolId,
        teacherId,
        active: true,
      },
      redirectTo: getRoleRedirectPath(user.role),
    });
  } catch (error) {
    console.error('[auth/login]', error);
    const message =
      error instanceof Error ? error.message : 'Login failed';
    const isDb =
      message.includes('connect') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ER_ACCESS_DENIED') ||
      message.includes('DATABASE');
    return NextResponse.json(
      {
        error: isDb
          ? 'Database connection failed. Check .env and run: npm run db:push && npm run db:seed'
          : 'Login failed',
      },
      { status: 500 }
    );
  }
}
