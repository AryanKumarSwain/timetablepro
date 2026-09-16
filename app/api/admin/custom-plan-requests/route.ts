import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

// GET /api/admin/custom-plan-requests - Get latest custom plan request for the current school
export async function GET() {
  try {
    const user = await requireSchoolAdmin();

    const request = await prisma.customPlanRequest.findFirst({
      where: {
        schoolId: user.schoolId,
        status: { in: ['PENDING', 'APPROVED'] },
        isPaid: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeCustomPlan = await prisma.customPlanRequest.findFirst({
      where: {
        schoolId: user.schoolId,
        status: 'COMPLETED',
        isPaid: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    return NextResponse.json({
      request: request ? {
        id: request.id,
        schoolId: request.schoolId,
        requestedFacultyLimit: request.requestedFacultyLimit,
        price: request.price ? Number(request.price) : null,
        priceYearly: request.priceYearly ? Number(request.priceYearly) : (request.price ? Math.round(Number(request.price) * 12 * 0.83) : null),
        status: request.status,
        isPaid: request.isPaid,
        createdAt: request.createdAt,
      } : null,
      activeCustomPlan: activeCustomPlan ? {
        id: activeCustomPlan.id,
        requestedFacultyLimit: activeCustomPlan.requestedFacultyLimit,
        price: activeCustomPlan.price ? Number(activeCustomPlan.price) : null,
        priceYearly: activeCustomPlan.priceYearly ? Number(activeCustomPlan.priceYearly) : (activeCustomPlan.price ? Math.round(Number(activeCustomPlan.price) * 12 * 0.83) : null),
        billingCycle: activeCustomPlan.billingCycle,
        paidAt: activeCustomPlan.paidAt,
      } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/custom-plan-requests - Create a custom plan request
export async function POST(request: NextRequest) {
  try {
    const user = await requireSchoolAdmin();
    
    const body = await request.json();
    const { requestedFacultyLimit } = body;
    
    const facultyLimitNum = Number(requestedFacultyLimit);
    if (!facultyLimitNum || facultyLimitNum <= 100) {
      return NextResponse.json(
        { error: 'Custom enterprise plan is mandatory for 101+ teachers. For up to 100 teachers, please choose the Elite plan.' },
        { status: 400 }
      );
    }
    
    // Get school with teacher count and existing active requests
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      include: {
        _count: {
          select: { teachers: true }
        },
        customPlanRequests: {
          where: {
            status: { in: ['PENDING', 'APPROVED'] },
            isPaid: false,
          }
        }
      }
    });
    
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    // Check if there's already an active request
    if (school.customPlanRequests.length > 0) {
      const existing = school.customPlanRequests[0];
      if (existing.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'Your custom plan request is already approved. Please complete payment to activate it.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'You already have a pending custom plan request under review' }, { status: 400 });
    }
    
    // Create custom plan request
    const customRequest = await prisma.customPlanRequest.create({
      data: {
        schoolId: school.id,
        requestedFacultyLimit: Number(requestedFacultyLimit),
      }
    });
    
    // Create system notification for super admins
    await prisma.notification.create({
      data: {
        title: 'Custom Plan Request',
        message: `${school.name} has requested a custom plan for ${requestedFacultyLimit} faculty.`,
        type: 'SYSTEM',
        scope: 'ALL_ADMINS',
        senderId: user.id,
        schoolId: school.id
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      requestId: customRequest.id 
    });
  } catch (error) {
    return handleApiError(error);
  }
}
