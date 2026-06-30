import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

// GET /api/super-admin/coupons - Fetch all coupons
export async function GET() {
  try {
    await requireSuperAdmin();

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(coupons);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/super-admin/coupons - Create new coupon
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { code, discountPercent, expiresAt, maxUses } = body;

    if (!code || discountPercent === undefined || discountPercent === null) {
      return NextResponse.json({ error: 'Code and discount percent are required' }, { status: 400 });
    }

    const parsedDiscountPercent = parseInt(discountPercent, 10);
    const parsedMaxUses = maxUses ? parseInt(maxUses, 10) : null;

    if (isNaN(parsedDiscountPercent) || parsedDiscountPercent < 0 || parsedDiscountPercent > 100) {
      return NextResponse.json({ error: 'Discount percent must be a number between 0 and 100' }, { status: 400 });
    }

    if (parsedMaxUses !== null && isNaN(parsedMaxUses)) {
      return NextResponse.json({ error: 'Max uses must be a valid number' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        discountPercent: parsedDiscountPercent,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: parsedMaxUses,
      }
    });

    return NextResponse.json(coupon);
  } catch (error) {
    return handleApiError(error);
  }
}
