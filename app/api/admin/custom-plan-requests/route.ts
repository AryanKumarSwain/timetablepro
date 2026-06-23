import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

// POST /api/admin/custom-plan-requests - Create a custom plan request
export async function POST(request: NextRequest) {
  try {
    const user = await requireSchoolAdmin();
    
    const body = await request.json();
    const { requestedFacultyLimit } = body;
    
    if (!requestedFacultyLimit || requestedFacultyLimit < 1) {
      return NextResponse.json({ error: 'Faculty limit must be at least 1' }, { status: 400 });
    }
    
    // Get school with teacher count
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      include: {
        _count: {
          select: { teachers: true }
        },
        customPlanRequests: {
          where: { status: 'PENDING' }
        }
      }
    });
    
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    // Check if there's already a pending request
    if (school.customPlanRequests.length > 0) {
      return NextResponse.json({ error: 'You already have a pending custom plan request' }, { status: 400 });
    }
    
    // Create custom plan request
    const customRequest = await prisma.customPlanRequest.create({
      data: {
        schoolId: school.id,
        requestedFacultyLimit
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
