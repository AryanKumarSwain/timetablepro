import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    const { id } = await params;

    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const absentRequest = await prisma.teacherAbsentRequest.findFirst({
      where: { id, schoolId },
    });

    if (!absentRequest) {
      return NextResponse.json({ error: 'Absent request not found' }, { status: 404 });
    }

    if (absentRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending requests can be reverted' }, { status: 400 });
    }

    // Ensure the request belongs to the current teacher
    const teacher = await prisma.teacher.findFirst({
      where: { id: absentRequest.teacherId, schoolId },
    });

    if (!teacher || teacher.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to revert this request' }, { status: 403 });
    }

    await prisma.teacherAbsentRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
