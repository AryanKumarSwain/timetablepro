import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSchoolAdmin();
    const { id: leaveRequestId } = await params;

    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      body = {};
    }

    const action = String(
      body?.action ??
      request.nextUrl.searchParams.get('action') ??
      ''
    ).toLowerCase();

    if (!leaveRequestId) {
      return NextResponse.json({ error: 'Leave request identifier missing.' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be approve or reject.' }, { status: 400 });
    }

    const leaveRequest = await prisma.schoolLeaveRequest.findFirst({
      where: {
        id: leaveRequestId,
        schoolId: user.schoolId,
        status: 'PENDING',
      },
      include: {
        teacher: true,
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Pending leave request not found.' }, { status: 404 });
    }

    const reviewedAt = new Date();
    const reviewedBy = user.id;

    if (action === 'approve') {
      // Create notification for the specific teacher only
      // Use workaround: create notification and only mark as read for the target teacher
      const notification = await prisma.notification.create({
        data: {
          title: 'Leave Request Approved',
          message: 'Your leave request has been approved. You can now join a new school.',
          type: 'INFO',
          scope: 'SCHOOL_TEACHERS',
          schoolId: user.schoolId,
          senderId: user.id,
        },
      });

      // Mark notification as read for all teachers EXCEPT the target teacher
      // This way only the target teacher will see it as unread
      if (leaveRequest.teacher.userId) {
        const allTeachers = await prisma.teacher.findMany({
          where: { schoolId: user.schoolId, userId: { not: null } },
          select: { userId: true },
        });

        const otherTeacherIds = allTeachers
          .map(t => t.userId)
          .filter(id => id && id !== leaveRequest.teacher.userId) as string[];

        if (otherTeacherIds.length > 0) {
          await prisma.notificationRead.createMany({
            data: otherTeacherIds.map(userId => ({
              notificationId: notification.id,
              userId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Now update teacher's schoolId to null
      await prisma.$transaction([
        prisma.schoolLeaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: 'APPROVED',
            reviewedAt,
            reviewedBy,
          },
        }),
        prisma.teacher.update({
          where: { id: leaveRequest.teacherId },
          data: {
            schoolId: null,
            leaveRequestStatus: 'NONE',
          },
        }),
        ...(leaveRequest.teacher.userId
          ? [
              prisma.user.update({
                where: { id: leaveRequest.teacher.userId },
                data: { schoolId: null },
              }),
            ]
          : []),
      ]);

      return NextResponse.json({ success: true, status: 'APPROVED' });
    }

    await prisma.$transaction([
      prisma.schoolLeaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'REJECTED',
          reviewedAt,
          reviewedBy,
        },
      }),
      prisma.teacher.update({
        where: { id: leaveRequest.teacherId },
        data: {
          leaveRequestStatus: 'REJECTED',
        },
      }),
    ]);

    // Create notification for the specific teacher only
    // Use workaround: create notification and mark as read for all teachers except target
    const notification = await prisma.notification.create({
      data: {
        title: 'Leave Request Declined',
        message: 'Your leave request has been declined by the administrator.',
        type: 'ALERT',
        scope: 'SCHOOL_TEACHERS',
        schoolId: user.schoolId,
        senderId: user.id,
      },
    });

    // Mark notification as read for all teachers EXCEPT the target teacher
    // This way only the target teacher will see it as unread
    if (leaveRequest.teacher.userId) {
      const allTeachers = await prisma.teacher.findMany({
        where: { schoolId: user.schoolId, userId: { not: null } },
        select: { userId: true },
      });

      const otherTeacherIds = allTeachers
        .map(t => t.userId)
        .filter(id => id && id !== leaveRequest.teacher.userId) as string[];

      if (otherTeacherIds.length > 0) {
        await prisma.notificationRead.createMany({
          data: otherTeacherIds.map(userId => ({
            notificationId: notification.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ success: true, status: 'REJECTED' });
  } catch (error) {
    console.error('[PATCH /api/admin/leave-requests/[id]]', error);
    return handleApiError(error);
  }
}
