import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

// GET /api/super-admin/transactions - Fetch all pending transactions
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const status = request.nextUrl.searchParams.get('status') || 'PENDING';
    
    const transactions = await prisma.subscriptionTransaction.findMany({
      where: { status: status as any },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            planId: true,
            licenseStatus: true,
            users: {
              where: { role: 'ADMIN' },
              select: {
                email: true,
                name: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(transactions);
  } catch (error) {
    return handleApiError(error);
  }
}
