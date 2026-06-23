import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/super-admin/schools/[id]/upgrade - Upgrade school plan
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const { planId } = body;
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    const school = await prisma.school.findUnique({
      where: { id },
      include: { users: { take: 1 } }
    });
    
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    // Find the plan
    const plan = await prisma.saaSPlan.findFirst({
      where: { id: planId }
    });
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    await prisma.$transaction([
      // Update school plan
      prisma.school.update({
        where: { id },
        data: { 
          planId,
          licenseStatus: 'ACTIVE'
        }
      }),
      
      // Create notification for school admin
      prisma.notification.create({
        data: {
          title: 'Plan Upgraded',
          message: `Your school has been upgraded to the ${plan.name} plan by the platform administrator.`,
          type: 'INFO',
          scope: 'ALL_ADMINS',
          senderId: superAdmin.id,
          schoolId: school.id
        }
      })
    ]);
    
    return NextResponse.json({ success: true, message: 'Plan upgraded successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
