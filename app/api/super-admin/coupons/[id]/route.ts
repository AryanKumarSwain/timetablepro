import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/super-admin/coupons/[id] - Update coupon
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const { code, discountPercent, isActive, expiresAt, maxUses } = body;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase().trim();
    if (discountPercent !== undefined) {
      const parsedDiscountPercent = parseInt(discountPercent, 10);
      if (isNaN(parsedDiscountPercent) || parsedDiscountPercent < 0 || parsedDiscountPercent > 100) {
        return NextResponse.json({ error: 'Discount percent must be a number between 0 and 100' }, { status: 400 });
      }
      updateData.discountPercent = parsedDiscountPercent;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (maxUses !== undefined) {
      const parsedMaxUses = maxUses ? parseInt(maxUses, 10) : null;
      if (parsedMaxUses !== null && isNaN(parsedMaxUses)) {
        return NextResponse.json({ error: 'Max uses must be a valid number' }, { status: 400 });
      }
      updateData.maxUses = parsedMaxUses;
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedCoupon);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/super-admin/coupons/[id] - Delete coupon
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await prisma.coupon.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
