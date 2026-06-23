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
          include: {
            _count: {
              select: { teachers: true }
            },
            plan: true,
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
    
    return NextResponse.json(requests.map((req: any) => ({
      id: req.id,
      schoolId: req.schoolId,
      schoolName: req.school.name,
      schoolCity: req.school.city,
      schoolCountry: req.school.country,
      schoolType: req.school.type,
      currentTeacherCount: req.school._count.teachers,
      currentPlan: req.school.plan ? {
        id: req.school.plan.id,
        name: req.school.plan.name,
        teacherMax: req.school.plan.teacherMax
      } : null,
      adminContacts: req.school.users.map((u: any) => ({
        name: u.name,
        email: u.email,
        phone: u.phone
      })),
      requestedFacultyLimit: req.requestedFacultyLimit,
      status: req.status,
      rejectionReason: req.rejectionReason,
      createdAt: req.createdAt
    })));
  } catch (error) {
    return handleApiError(error);
  }
}
