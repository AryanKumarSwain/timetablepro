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

    const withPlans = transactions.map(t => ({
      ...t,
      plan: planMap[t.planId] || null,
    }));

    return NextResponse.json(withPlans);
  } catch (error) {
    return handleApiError(error);
  }
}
