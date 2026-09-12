import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/super-admin/schools/[id]/suspend - Suspend or Unsuspend a school account
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { id } = await context.params;
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // body empty is ok
    }

    const isUnsuspend = body.action === 'unsuspend' || body.unsuspend === true;
    
    const school = await prisma.school.findUnique({
      where: { id },
      include: { users: { take: 1 } }
    });
    
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    const newStatus = isUnsuspend ? 'ACTIVE' : 'SUSPENDED';

    await prisma.$transaction([
      // Update school license status
      prisma.school.update({
        where: { id },
        data: { licenseStatus: newStatus }
      }),
      
      // Create notification for school admin
      prisma.notification.create({
        data: {
          title: isUnsuspend ? 'Account Reactivated' : 'Account Suspended',
          message: isUnsuspend
            ? 'Your school account has been reactivated. You now have full access to your account.'
            : 'Your school account has been suspended by the platform administrator. Please contact support for more information.',
          type: isUnsuspend ? 'INFO' : 'ALERT',
          scope: 'ALL_ADMINS',
          senderId: superAdmin.id,
          schoolId: school.id
        }
      })
    ]);
    
    return NextResponse.json({
      success: true,
      message: isUnsuspend ? 'Account unsuspended successfully' : 'Account suspended successfully'
    });
  } catch (error) {
    return handleApiError(error);
  }
}
