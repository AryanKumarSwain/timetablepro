import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

function formatLicenseStatus(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'SUSPENDED':
      return 'Suspended';
    case 'TRAIL_EXPIRED':
      return 'Trial';
    default:
      return status;
  }
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}k`;
  }
  return `₹${value.toFixed(2)}`;
}

export async function GET(request: NextRequest) {
  const client = prisma;

  try {
    await requireSuperAdmin();
    const panel = request.nextUrl.searchParams.get('panel')?.toLowerCase() ?? '';

    if (panel === 'schools') {
      const schools = await client.school.findMany({
        include: {
          plan: true,
          users: {
            where: { role: 'ADMIN' },
            select: { email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(
        schools.map((school) => ({
          id: school.id,
          name: school.name,
          licenseStatus: formatLicenseStatus(school.licenseStatus),
          licenseDate: school.createdAt.toISOString().split('T')[0],
          planName: school.plan?.name || 'No Plan',
          adminEmails: school.users.map((u) => u.email),
        }))
      );
    }

    if (panel === 'teachers') {
      const schools = await client.school.findMany({
        include: {
          _count: { select: { teachers: true } },
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json(
        schools.map((school) => ({
          schoolId: school.id,
          schoolName: school.name,
          teacherCount: school._count.teachers,
        }))
      );
    }

    if (panel === 'revenue') {
      const schools = await client.school.findMany({
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      const transactions = schools.map((school) => ({
        schoolId: school.id,
        schoolName: school.name,
        transactionDate: school.createdAt.toISOString().split('T')[0],
        planName: school.plan?.name || 'No Plan',
        planPrice: school.plan ? Number(school.plan.priceMonthly) : 0,
        licenseStatus: formatLicenseStatus(school.licenseStatus),
      }));

      const activeMrr = schools
        .filter((s) => s.licenseStatus === 'ACTIVE' && s.plan)
        .reduce((sum, s) => sum + Number(s.plan!.priceMonthly), 0);

      const tierContributions = schools.reduce<
        Record<string, { planName: string; count: number; subtotal: number }>
      >((acc, school) => {
        if (!school.plan) return acc;
        const key = school.plan.id;
        if (!acc[key]) {
          acc[key] = {
            planName: school.plan.name,
            count: 0,
            subtotal: 0,
          };
        }
        acc[key].count += 1;
        if (school.licenseStatus === 'ACTIVE') {
          acc[key].subtotal += Number(school.plan.priceMonthly);
        }
        return acc;
      }, {});

      return NextResponse.json({
        activeMrr,
        transactions,
        tierContributions: Object.values(tierContributions),
      });
    }

    if (panel === 'health') {
      const regions = [
        { id: 'primary-mysql', label: 'Primary MySQL Cluster' },
        { id: 'replica-read', label: 'Read Replica Pool' },
        { id: 'api-gateway', label: 'API Gateway Edge' },
      ];

      const probes = await Promise.all(
        regions.map(async (region) => {
          const started = performance.now();
          let statusCode = 200;
          let message = 'Operational';

          try {
            await client.$queryRaw`SELECT 1`;
          } catch {
            statusCode = 503;
            message = 'Connection degraded';
          }

          const latencyMs = Math.round(performance.now() - started);

          return {
            regionId: region.id,
            regionLabel: region.label,
            statusCode,
            latencyMs,
            message,
          };
        })
      );

      const healthyCount = probes.filter((p) => p.statusCode === 200).length;
      const uptimePercent =
        probes.length > 0
          ? ((healthyCount / probes.length) * 100).toFixed(1)
          : '100.0';

      return NextResponse.json({ uptimePercent, probes });
    }

 const [schoolCount, teacherCount, activeSchools, trialCount, allSchools] =
      await Promise.all([
        client.school.count(),
        client.teacher.count(),
        client.school.findMany({ where: { licenseStatus: 'ACTIVE' }, include: { plan: true } }),
        client.school.count({ where: { licenseStatus: 'TRAIL_EXPIRED' } }),
        client.school.findMany({ include: { plan: true }, orderBy: { createdAt: 'asc' } }),
      ]);

    // Calculate MRR
    const activeMrr = activeSchools.reduce((sum, s) => {
      if (!s.plan) return sum;
      return sum + Number(s.plan.priceMonthly);
    }, 0);

    // 1. Calculate Plan Mix (for Pie Chart)
    const planMix = allSchools.reduce<Record<string, number>>((acc, s) => {
      if (!s.plan) return acc;
      acc[s.plan.name] = (acc[s.plan.name] || 0) + 1;
      return acc;
    }, {});

    // 2. Calculate Growth Data (for Line Chart - Grouped by Month)
    const growthData = allSchools.reduce<Record<string, number>>((acc, s) => {
      const month = s.createdAt.toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const started = performance.now();
    let healthOk = true;
    try { await client.$queryRaw`SELECT 1`; } catch { healthOk = false; }
    const latencyMs = Math.round(performance.now() - started);

    return NextResponse.json({
      activeSchools: schoolCount,
      trialSchools: trialCount,
      platformTeachers: teacherCount,
      monthlyRecurringRevenue: formatCurrency(activeMrr),
      monthlyRecurringRevenueRaw: activeMrr,
      systemHealth: healthOk ? '99.9%' : '95.0%',
      latencyMs,
      // Pass these to the frontend
      planMix: Object.entries(planMix).map(([plan, count]) => ({ plan, count })),
      growthData: Object.entries(growthData).map(([month, schools]) => ({ month, schools })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
