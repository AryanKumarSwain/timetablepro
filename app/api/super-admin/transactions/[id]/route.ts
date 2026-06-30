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
      // Get the school's current plan details
      const school = await prisma.school.findUnique({
        where: { id: transaction.schoolId },
        include: { plan: true }
      });

      // Calculate plan dates based on billing cycle
      const now = new Date();
      const planStartsAt = now;
      let planEndsAt: Date;

      if (transaction.billingCycle === 'annual') {
        planEndsAt = new Date(now);
        planEndsAt.setFullYear(planEndsAt.getFullYear() + 1);
      } else {
        planEndsAt = new Date(now);
        planEndsAt.setMonth(planEndsAt.getMonth() + 1);
      }

      // If school has an active plan with end date, queue it
      const hasActivePlan = school?.planId && school?.planEndsAt && new Date(school.planEndsAt) > now;

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
            planStartsAt,
            planEndsAt,
            licenseStatus: 'ACTIVE',
            // Queue current plan if it exists and is still active
            ...(hasActivePlan && {
              queuedPlanId: school.planId,
              queuedPlanStartsAt: planEndsAt
            })
          }
        }),

        // 3. Increment coupon usage if coupon was applied
        ...(transaction.couponId ? [
          prisma.coupon.update({
            where: { id: transaction.couponId },
            data: { currentUses: { increment: 1 } }
          })
        ] : []),

        // 4. Create notification for school admin
        prisma.notification.create({
          data: {
            title: 'Plan Activated',
            message: hasActivePlan
              ? `Your new plan has been activated. Your previous plan will resume automatically after this plan ends.`
              : `Your subscription has been approved and activated.`,
            type: 'INFO',
            scope: 'SCHOOL_TEACHERS',
            schoolId: transaction.schoolId,
            senderId: superAdmin.id,
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
            scope: 'SCHOOL_TEACHERS',
            senderId: superAdmin.id,
            schoolId: transaction.schoolId,
          }
        })
      ]);
      
      return NextResponse.json({ success: true, message: 'Transaction rejected' });
    }
  } catch (error) {
    return handleApiError(error);
  }
}