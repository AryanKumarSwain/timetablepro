import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/super-admin/schools/[id]/suspend - Suspend a school account
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
      // Update school license status
      prisma.school.update({
        where: { id },
        data: { licenseStatus: 'SUSPENDED' }
      }),
      
      // Create notification for school admin
      prisma.notification.create({
        data: {
          title: 'Account Suspended',
          message: 'Your school account has been suspended by the platform administrator. Please contact support for more information.',
          type: 'ALERT',
          scope: 'ALL_ADMINS',
          senderId: superAdmin.id,
          schoolId: school.id
        }
      })
    ]);
    
    return NextResponse.json({ success: true, message: 'Account suspended successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
