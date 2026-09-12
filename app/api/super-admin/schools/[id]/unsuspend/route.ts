import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/super-admin/schools/[id]/unsuspend - Unsuspend / Reactivate a school account
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { id } = await context.params;
    
    const school = await prisma.school.findUnique({
      where: { id },
      include: { users: { take: 1 } }
    });
    
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    await prisma.$transaction([
      prisma.school.update({
        where: { id },
        data: { licenseStatus: 'ACTIVE' }
      }),
      prisma.notification.create({
        data: {
          title: 'Account Reactivated',
          message: 'Your school account has been reactivated. You now have full access to your account.',
          type: 'INFO',
          scope: 'ALL_ADMINS',
          senderId: superAdmin.id,
          schoolId: school.id
        }
      })
    ]);
    
    return NextResponse.json({ success: true, message: 'Account unsuspended successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
