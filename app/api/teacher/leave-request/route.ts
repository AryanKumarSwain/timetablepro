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

    // If teacher has a rejected request, check if it's within 24 hours
    if (teacher.leaveRequestStatus === 'REJECTED') {
      const rejectedRequest = await prisma.schoolLeaveRequest.findFirst({
        where: {
          teacherId: teacher.id,
          schoolId,
          status: 'REJECTED',
        },
        orderBy: { requestedAt: 'desc' },
      });

      if (rejectedRequest) {
        const hoursSinceRejection = (Date.now() - new Date(rejectedRequest.requestedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceRejection < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceRejection);
          return NextResponse.json(
            { error: `You can resubmit your request after ${hoursRemaining} hours.` },
            { status: 400 }
          );
        }
      }

      // If more than 24 hours have passed, allow resubmission by updating status to NONE
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { leaveRequestStatus: 'NONE' },
      });
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
    const notification = await prisma.notification.create({
      data: {
        title: 'Leave Request',
        message: `${teacher.name} has requested to leave the school.`,
        type: 'ALERT',
        scope: 'ALL_ADMINS',
        schoolId,
        senderId: user.id,
      },
    });

    // Mark notification as read for all admins except the school admin
    const allAdmins = await prisma.user.findMany({
      where: { 
        role: 'ADMIN',
        schoolId,
        id: { not: user.id }
      },
      select: { id: true },
    });

    if (allAdmins.length > 0) {
      await prisma.notificationRead.createMany({
        data: allAdmins.map(admin => ({
          notificationId: notification.id,
          userId: admin.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, leaveRequest });
  } catch (error) {
    console.error('[POST /api/teacher/leave-request]', error);
    return handleApiError(error);
  }
}
