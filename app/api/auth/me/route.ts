import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getRoleRedirectPath } from '@/lib/session';

// --- GET: Fetch current user details & format for client state ---
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { user } = session;
  let teacherId: string | undefined;
  let phone: string | null = null;
  let name = user.email.split('@')[0];

  // Try fetching the deeper record profile from the DB to get the live Name and Phone values
  if (user.role === 'TEACHER' && user.schoolId) {
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId: user.schoolId, email: user.email },
    });
    teacherId = teacher?.id;
    if (teacher) {
      name = teacher.name;
      phone = teacher.phone || null;
    }
  } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    // If you have a dedicated Admin profile table or keep details on User model, look it up here.
    // Example assuming standard Prisma User model schema lookup:
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser) {
      name = dbUser.name || name;
      phone = (dbUser as any).phone || null; // fallback gracefully if column differs
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name,
      phone,
      role: user.role.toLowerCase().replace('_', '-') as 'super-admin' | 'admin' | 'teacher',
      schoolId: user.schoolId,
      teacherId,
      active: true,
    },
    redirectTo: getRoleRedirectPath(user.role),
  });
}

// --- PATCH: Save structural details updated from Settings page ---
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized payload exception' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name parameter is completely mandatory' }, { status: 400 });
    }

    const { user } = session;

    if (user.role !== 'TEACHER') {
      return NextResponse.json({
        id: user.id,
        name: name.trim(),
        email: user.email,
        phone: phone?.trim() || null,
      });
    }

    // Teachers have a dedicated profile record for name/phone updates.
    await prisma.teacher.updateMany({
      where: { schoolId: user.schoolId, email: user.email },
      data: { name: name.trim(), phone: phone?.trim() || null },
    });

    return NextResponse.json({
      id: user.id,
      name: name.trim(),
      email: user.email,
      phone: phone?.trim() || null,
    });
  } catch (error) {
    console.error('[PATCH /api/auth/me Exception]:', error);
    return NextResponse.json({ error: 'Failed saving updated matrix adjustments' }, { status: 500 });
  }
}