import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const planIds: string[] = Array.isArray(body.planIds)
      ? body.planIds
      : Array.isArray(body.orderedIds)
        ? body.orderedIds
        : [];

    if (!planIds || planIds.length === 0) {
      return NextResponse.json({ error: 'planIds array is required' }, { status: 400 });
    }

    // Update orderIndex for each plan with raw SQL fallback for dev client latency
    try {
      await prisma.$transaction(
        planIds.map((id, index) =>
          prisma.saaSPlan.update({
            where: { id },
            data: { orderIndex: index },
          })
        )
      );
    } catch (txErr) {
      for (let index = 0; index < planIds.length; index++) {
        await prisma.$executeRawUnsafe(
          'UPDATE `saasplan` SET `orderIndex` = ? WHERE `id` = ?',
          index,
          planIds[index]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Plan display order updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
