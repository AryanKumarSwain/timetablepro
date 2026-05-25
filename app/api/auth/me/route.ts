import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getRoleRedirectPath } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { user } = session;
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
}
