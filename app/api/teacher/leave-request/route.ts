import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('TEACHER');
    const schoolId = user.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const reason = body.reason || '';

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: { userId: user.id, schoolId },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher record not found' },
        { status: 404 }
      );
    }

    // Check if teacher already has a pending leave request
    const existingRequest = await prisma.schoolLeaveRequest.findFirst({
      where: {
        teacherId: teacher.id,
        schoolId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending leave request.' },
        { status: 400 }
      );
    }

    // Create leave request
    const leaveRequest = await prisma.schoolLeaveRequest.create({
      data: {
        teacherId: teacher.id,
        schoolId,
        status: 'PENDING',
        reason,
      },
    });

    // Update teacher's leave request status
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { leaveRequestStatus: 'PENDING' },
    });

    // Create notification for school admin only
    await prisma.notification.create({
      data: {
        title: 'Leave Request',
        message: `${teacher.name} has requested to leave the school.`,
        type: 'ALERT',
        scope: 'SCHOOL_TEACHERS',
        schoolId,
        senderId: user.id,
      },
    });

    return NextResponse.json({ success: true, leaveRequest });
  } catch (error) {
    console.error('[POST /api/teacher/leave-request]', error);
    return handleApiError(error);
  }
}
