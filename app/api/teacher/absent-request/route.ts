import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    const body = await request.json();
    const { teacherId, date, periodId, classId, reason } = body;

    if (!teacherId || !date || !periodId || !classId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if teacherAbsentRequest model exists in Prisma client
    if (!prisma.teacherAbsentRequest) {
      return NextResponse.json({ error: 'Database migration required. Please run: npx prisma generate' }, { status: 500 });
    }

    // Verify the teacher belongs to the school
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Check if there's already a pending request for this slot
    const existingRequest = await prisma.teacherAbsentRequest.findFirst({
      where: {
        teacherId,
        date,
        periodId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'A pending request already exists for this slot' }, { status: 400 });
    }

    // Create the absent request
    const absentRequest = await prisma.teacherAbsentRequest.create({
      data: {
        teacherId,
        date,
        periodId,
        classId,
        reason: reason || null,
        status: 'PENDING',
        schoolId,
      },
    });

    // Create notification for admins
    await prisma.notification.create({
      data: {
        title: 'Absent Request',
        message: `${teacher.name} has requested to be absent on ${date}`,
        type: 'SYSTEM',
        scope: 'ALL_ADMINS',
        schoolId,
        senderId: user.id,
      },
    });

    return NextResponse.json({ success: true, request: absentRequest, absentRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
