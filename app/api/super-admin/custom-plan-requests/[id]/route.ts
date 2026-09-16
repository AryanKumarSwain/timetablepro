import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';
import { sendCustomPlanApprovedEmail } from '@/lib/mailer';

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
    const { action, price, priceYearly, rejectionReason } = body;
    
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    const customRequest = await prisma.customPlanRequest.findUnique({
      where: { id },
      include: {
        school: {
          include: {
            users: {
              where: { role: 'ADMIN' },
              select: { email: true, name: true }
            }
          }
        }
      }
    });
    
    if (!customRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    if (customRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }
    
    if (action === 'approve') {
      const quotedPrice = Number(price);
      if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
        return NextResponse.json({ error: 'A valid monthly price greater than 0 is required for approval' }, { status: 400 });
      }

      // Default yearly price: (quotedPrice * 12) with 17% off, or custom yearly price if specified
      const quotedPriceYearly = Number(priceYearly) > 0
        ? Number(priceYearly)
        : Math.round(quotedPrice * 12 * 0.83);
      
      // Update custom request with price quotes (monthly & yearly) and mark as APPROVED (awaiting payment)
      await prisma.$transaction([
        prisma.customPlanRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            price: quotedPrice.toFixed(2),
            priceYearly: quotedPriceYearly.toFixed(2),
            isPaid: false,
          }
        }),
        
        // Create in-app notification for school admin
        prisma.notification.create({
          data: {
            title: 'Custom Plan Approved! 🎉',
            message: `Your custom plan request for ${customRequest.requestedFacultyLimit} teachers has been approved at ₹${quotedPrice.toLocaleString('en-IN')}/month or ₹${quotedPriceYearly.toLocaleString('en-IN')}/year (17% off). Please complete payment in Billing & Upgrade to activate your plan.`,
            type: 'INFO',
            scope: 'ALL_ADMINS',
            senderId: superAdmin.id,
            schoolId: customRequest.schoolId
          }
        })
      ]);

      // Send email to school admins asynchronously
      const school = customRequest.school;
      const targetEmails = (school.users || [])
        .map(u => ({ email: u.email, name: u.name || 'Admin' }))
        .filter(u => Boolean(u.email));

      if (targetEmails.length === 0 && school.email) {
        targetEmails.push({ email: school.email, name: school.name });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timetablepro.webncode.in';
      const paymentUrl = `${appUrl}/admin/upgrade`;

      for (const recipient of targetEmails) {
        sendCustomPlanApprovedEmail({
          to: recipient.email,
          adminName: recipient.name,
          schoolName: school.name,
          facultyLimit: customRequest.requestedFacultyLimit,
          price: quotedPrice,
          priceYearly: quotedPriceYearly,
          paymentUrl,
        }).catch(err => console.error('[custom-plan-approve] Email error:', err));
      }
      
      return NextResponse.json({
        success: true,
        message: `Custom plan approved: ₹${quotedPrice.toLocaleString('en-IN')}/mo and ₹${quotedPriceYearly.toLocaleString('en-IN')}/yr. Awaiting school payment.`
      });
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
