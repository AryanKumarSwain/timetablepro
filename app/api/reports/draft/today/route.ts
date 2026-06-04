import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReportResponse } from '@/lib/report-utils';

const reportInclude = {
  teacher: true,
  entries: { include: { class: true, subject: true } },
} as const;

async function resolveTeacher(schoolId: string, userEmail: string) {
  return prisma.teacher.findFirst({
    where: { schoolId, email: userEmail },
  });
}

export async function GET() {
  try {
    const { schoolId, user } = await requireSchoolContext();
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teacher = await resolveTeacher(schoolId, user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const report = await prisma.dailyReport.findUnique({
      where: { teacherId_reportDate: { teacherId: teacher.id, reportDate: today } },
      include: reportInclude,
    });

    if (!report) {
      return NextResponse.json({ error: 'Draft report not found' }, { status: 404 });
    }

    return NextResponse.json(mapReportResponse(report));
  } catch (error) {
    return handleApiError(error);
  }
}
