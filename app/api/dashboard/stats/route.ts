import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();
    const today = new Date().toISOString().split('T')[0];

    const [
      totalTeachers,
      totalClasses,
      todayAbsent,
      todayReplacements,
      pendingReplacements,
    ] = await Promise.all([
      prisma.teacher.count({ where: schoolWhere(schoolId) }),
      prisma.classRoom.count({ where: schoolWhere(schoolId) }),
      prisma.teacherAttendance.count({
        where: { schoolId, date: today, status: 'ABSENT' },
      }),
      prisma.replacementAssignment.count({
        where: { schoolId, date: today },
      }),
      prisma.replacementAssignment.count({
        where: { schoolId, status: 'PENDING' },
      }),
    ]);

    return NextResponse.json({
      totalTeachers,
      totalClasses,
      todayAbsent,
      todayReplacements,
      pendingReplacements,
    });
  } catch (error) {
    console.error('[GET /api/dashboard/stats]', error);
    return handleApiError(error);
  }
}
