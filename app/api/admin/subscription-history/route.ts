import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireSchoolAdmin();
    const transactions = await prisma.subscriptionTransaction.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { createdAt: 'desc' },
    });

    // Load related plans for display (SubscriptionTransaction has planId but
    // no Prisma relation in the schema). Attach plan info manually.
    const planIds = Array.from(new Set(transactions.map(t => t.planId).filter(Boolean)));
    const plans = planIds.length > 0 ? await prisma.saaSPlan.findMany({ where: { id: { in: planIds } } }) : [];
    const planMap: Record<string, any> = {};
    for (const p of plans) planMap[p.id] = p;

    // Load custom plan requests for this school to identify custom enterprise plan transactions
    const customRequests = await prisma.customPlanRequest.findMany({
      where: {
        schoolId: user.schoolId,
        isPaid: true,
      },
    });

    const withPlans = transactions.map(t => {
      // Direct payment ID / order ID match
      let matchedCustom = customRequests.find(
        c => (c.razorpayPaymentId && c.razorpayPaymentId === t.utrNumber) ||
             (c.razorpayOrderId && c.razorpayOrderId === t.utrNumber)
      );

      // Fallback: match by paidAt within 5 minutes
      if (!matchedCustom) {
        matchedCustom = customRequests.find(c => {
          if (!c.paidAt) return false;
          const diffMs = Math.abs(new Date(t.createdAt).getTime() - new Date(c.paidAt).getTime());
          return diffMs < 5 * 60 * 1000;
        });
      }

      const isCustomPlan = Boolean(matchedCustom);

      return {
        ...t,
        plan: planMap[t.planId] || null,
        isCustomPlan,
        customFacultyLimit: matchedCustom?.requestedFacultyLimit || null,
      };
    });

    return NextResponse.json(withPlans);
  } catch (error) {
    return handleApiError(error);
  }
}
