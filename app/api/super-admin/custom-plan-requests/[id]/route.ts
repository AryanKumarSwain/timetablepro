import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/super-admin/custom-plan-requests/[id] - Approve or reject custom plan request
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const { action, facultyLimit, rejectionReason } = body;
    
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    const customRequest = await prisma.customPlanRequest.findUnique({
      where: { id },
      include: { school: true }
    });
    
    if (!customRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    if (customRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }
    
    if (action === 'approve') {
      // Find the Max/Elite plan, or fallback to the plan with highest teacher limit
      let maxPlan = await prisma.saaSPlan.findFirst({
        where: {
          OR: [
            { name: { contains: 'elite' } },
            { name: { contains: 'Elite' } },
            { name: { contains: 'ELITE' } }
          ]
        }
      });
      
      if (!maxPlan) {
        // Fallback to plan with highest teacherMax
        maxPlan = await prisma.saaSPlan.findFirst({
          orderBy: { teacherMax: 'desc' }
        });
      }
      
      if (!maxPlan) {
        return NextResponse.json({ error: 'No plans available to assign' }, { status: 400 });
      }
      
      await prisma.$transaction([
        // Update custom request status
        prisma.customPlanRequest.update({
          where: { id },
          data: { status: 'APPROVED' }
        }),
        
        // Update school to Max plan with custom faculty limit
        prisma.school.update({
          where: { id: customRequest.schoolId },
          data: {
            planId: maxPlan.id,
            licenseStatus: 'ACTIVE'
          }
        }),
        
        // Create notification for school admin
        prisma.notification.create({
          data: {
            title: 'Custom Plan Approved',
            message: `Your custom plan request for ${facultyLimit} faculty has been approved. You have been upgraded to the ${maxPlan.name} plan.`,
            type: 'INFO',
            scope: 'ALL_ADMINS',
            senderId: superAdmin.id,
            schoolId: customRequest.schoolId
          }
        })
      ]);
      
      return NextResponse.json({ success: true, message: `Custom plan approved and ${maxPlan.name} plan granted` });
    } else {
      await prisma.$transaction([
        // Reject custom request
        prisma.customPlanRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: rejectionReason || 'Request declined'
          }
        }),
        
        // Create notification for school admin
        prisma.notification.create({
          data: {
            title: 'Custom Plan Request Declined',
            message: `Your custom plan request has been declined. Reason: ${rejectionReason || 'Request declined'}.`,
            type: 'ALERT',
            scope: 'ALL_ADMINS',
            senderId: superAdmin.id,
            schoolId: customRequest.schoolId
          }
        })
      ]);
      
      return NextResponse.json({ success: true, message: 'Custom plan request rejected' });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
