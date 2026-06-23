import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

// GET /api/super-admin/custom-plan-requests - Fetch all custom plan requests
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const status = request.nextUrl.searchParams.get('status') || 'PENDING';
    
    const requests = await prisma.customPlanRequest.findMany({
      where: { status: status as any },
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(requests.map((req: any) => ({
      id: req.id,
      schoolId: req.schoolId,
      schoolName: req.school.name,
      requestedFacultyLimit: req.requestedFacultyLimit,
      status: req.status,
      rejectionReason: req.rejectionReason,
      createdAt: req.createdAt
    })));
  } catch (error) {
    return handleApiError(error);
  }
}
