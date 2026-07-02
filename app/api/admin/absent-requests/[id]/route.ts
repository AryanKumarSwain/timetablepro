import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Check if teacherAbsentRequest model exists in Prisma client
    if (!prisma.teacherAbsentRequest) {
      return NextResponse.json({ error: 'Database migration required. Please run: npx prisma generate' }, { status: 500 });
    }

    const absentRequest = await prisma.teacherAbsentRequest.findFirst({
      where: { id, schoolId },
      include: { teacher: true },
    });

    if (!absentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (absentRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    await prisma.teacherAbsentRequest.update({
      where: { id },
      data: { status: newStatus },
    });

    // If approved, create or update teacher attendance record as absent
    if (action === 'approve') {
      await prisma.teacherAttendance.upsert({
        where: {
          teacherId_date: {
            teacherId: absentRequest.teacherId,
            date: absentRequest.date,
          },
        },
        update: {
          status: 'ABSENT',
          schoolId, // Ensures the school binding remains consistent if updated
        },
        create: {
          teacherId: absentRequest.teacherId,
          date: absentRequest.date,
          status: 'ABSENT',
          schoolId,
        },
      });

      // Create notification for the teacher
      await prisma.notification.create({
        data: {
          title: 'Absent Request Approved',
          message: `Your absent request for ${absentRequest.date} has been approved.`,
          type: 'SYSTEM',
          scope: 'SCHOOL_TEACHERS',
          schoolId,
          senderId: user.id,
          targetUserId: absentRequest.teacher.userId,
        },
      });
    } else {
      // Create notification for the teacher
      await prisma.notification.create({
        data: {
          title: 'Absent Request Rejected',
          message: `Your absent request for ${absentRequest.date} has been rejected.`,
          type: 'SYSTEM',
          scope: 'SCHOOL_TEACHERS',
          schoolId,
          senderId: user.id,
          targetUserId: absentRequest.teacher.userId,
        },
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    return handleApiError(error);
  }
}