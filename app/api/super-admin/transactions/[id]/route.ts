import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/super-admin/transactions/[id] - Approve or reject transaction
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const superAdmin = await requireSuperAdmin();
    
    const { id } = await context.params;
    const body = await request.json();
    const { action, rejectionReason } = body;
    
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    const transaction = await prisma.subscriptionTransaction.findUnique({
      where: { id },
      include: { 
        school: {
          include: {
            users: {
              take: 1
            }
          }
        } 
      }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    if (transaction.status !== 'PENDING') {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 400 });
    }
    
    const targetUserId = transaction.school.users[0]?.id || null;

    if (action === 'approve') {
      await prisma.$transaction([
        // 1. Update transaction status
        prisma.subscriptionTransaction.update({
          where: { id },
          data: { status: 'APPROVED' }
        }),
        
        // 2. Update school plan and license status
        prisma.school.update({
          where: { id: transaction.schoolId },
          data: {
            planId: transaction.planId,
            licenseStatus: 'ACTIVE'
          }
        }),
        
        // 3. Create notification for school admin (with scope supplied)
        prisma.notification.create({
          data: {
            title: 'Plan Activated',
            message: `Your subscription has been approved and activated. UTR: ${transaction.utrNumber}`,
            type: 'INFO',
            scope: 'ALL_ADMINS',
            senderId: superAdmin.id,
            schoolId: transaction.schoolId,
            targetUserId
          }
        })
      ]);
      
      return NextResponse.json({ success: true, message: 'Transaction approved and plan activated' });
    } else {
      await prisma.$transaction([
        // 1. Reject transaction
        prisma.subscriptionTransaction.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: rejectionReason || 'Payment verification failed'
          }
        }),
        
        // 2. Create notification for school admin (with scope supplied)
        prisma.notification.create({
          data: {
            title: 'Payment Verification Failed',
            message: `Your payment verification failed. Reason: ${rejectionReason || 'Payment verification failed'}. Please contact support.`,
            type: 'ALERT',
            scope: 'ALL_ADMINS',
            senderId: superAdmin.id,
            schoolId: transaction.schoolId,
            targetUserId
          }
        })
      ]);
      
      return NextResponse.json({ success: true, message: 'Transaction rejected' });
    }
  } catch (error) {
    return handleApiError(error);
  }
}