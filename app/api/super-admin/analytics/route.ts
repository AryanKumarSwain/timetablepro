import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

export async function GET() {
  try {
    await requireSuperAdmin();

    const totalSchools = await prisma.school.count();

    const statusDistribution = await prisma.school.groupBy({
      by: ['licenseStatus'],
      _count: true,
    });

    const planBreakdown = await prisma.saaSPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
      include: {
        _count: {
          select: {
            schools: true,
          },
        },
      },
    });

    const statusMap = statusDistribution.reduce((acc, item) => {
      acc[item.licenseStatus] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalSchools,
      statusDistribution: {
        ACTIVE: statusMap['ACTIVE'] || 0,
        TRIAL: statusMap['TRIAL'] || 0,
        SUSPENDED: statusMap['SUSPENDED'] || 0,
        TRAIL_EXPIRED: statusMap['TRAIL_EXPIRED'] || 0,
      },
      planBreakdown: planBreakdown.map((plan) => ({
        id: plan.id,
        name: plan.name,
        teacherMin: plan.teacherMin,
        teacherMax: plan.teacherMax,
        priceMonthly: Number(plan.priceMonthly),
        schoolCount: plan._count.schools,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
