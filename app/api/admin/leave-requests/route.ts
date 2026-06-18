import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await requireSchoolAdmin();

    const leaveRequestModel = (prisma as any).schoolLeaveRequest ?? (prisma as any).SchoolLeaveRequest;
    if (!leaveRequestModel) {
      throw new Error('Prisma model `SchoolLeaveRequest` is not available. Run `npx prisma generate`.');
    }

    const leaveRequests = await leaveRequestModel.findMany({
      where: {
        schoolId: user.schoolId,
        status: 'PENDING',
      },
      orderBy: { requestedAt: 'asc' },
      include: {
        teacher: true,
      },
    });

    const payload = leaveRequests.map((request) => ({
      id: request.id,
      teacherId: request.teacherId,
      teacherName: request.teacher.name,
      teacherEmail: request.teacher.email,
      requestedAt: request.requestedAt,
      reason: request.reason,
    }));

    return NextResponse.json({ data: payload });
  } catch (error) {
    console.error('[GET /api/admin/leave-requests]', error);
    return handleApiError(error);
  }
}
