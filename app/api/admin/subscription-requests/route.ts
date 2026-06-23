import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

// POST /api/admin/subscription-requests - Create a new subscription request
export async function POST(request: NextRequest) {
  try {
    const user = await requireSchoolAdmin();
    
    const body = await request.json();
    const { planId, amount, billingCycle, utrNumber, mobileNumber, state } = body;
    
    if (!planId || !amount || !billingCycle || !utrNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (!utrNumber.trim()) {
      return NextResponse.json({ error: 'UTR number is required' }, { status: 400 });
    }
    
    // Get school from user
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      include: { plan: true }
    });
    
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    // Create subscription transaction
    const transaction = await prisma.subscriptionTransaction.create({
      data: {
        schoolId: school.id,
        planId,
        amount: amount.toString(),
        billingCycle,
        utrNumber: utrNumber.trim(),
        status: 'PENDING'
      }
    });

    // Create system notification for all admins
    await prisma.notification.create({
      data: {
        title: 'New Subscription Request',
        message: `${school.name} has submitted a payment proof for plan upgrade. UTR: ${utrNumber.trim()}. Amount: ₹${amount}`,
        type: 'SYSTEM',
        scope: 'ALL_ADMINS',
        senderId: user.id,
        schoolId: school.id
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      transactionId: transaction.id,
      utrNumber: transaction.utrNumber
    });
  } catch (error) {
    return handleApiError(error);
  }
}
