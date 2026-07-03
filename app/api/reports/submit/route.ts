import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReportResponse, parseReportDateParam } from '@/lib/report-utils';

const reportInclude = {
  teacher: true,
  entries: { include: { class: true, subject: true } },
} as const;

async function resolveTeacher(schoolId: string, userEmail: string) {
  return prisma.teacher.findFirst({
    where: { schoolId, email: userEmail },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teacher = await resolveTeacher(schoolId, user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const body = await request.json();
    const reportDate = parseReportDateParam(body.date ? String(body.date) : 'today');
    
    let report = null;

    if (body.reportId) {
      report = await prisma.dailyReport.findFirst({
        where: { id: body.reportId, teacherId: teacher.id, ...schoolWhere(schoolId) },
      });
    }

    if (!report) {
      report = await prisma.dailyReport.findUnique({
        where: { teacherId_reportDate: { teacherId: teacher.id, reportDate } },
      });
    }

    if (!report) {
      report = await prisma.dailyReport.create({
        data: {
          teacherId: teacher.id,
          schoolId,
          reportDate,
          status: body.status ?? 'SUBMITTED',
          submittedAt: body.status === 'SUBMITTED' ? new Date() : null,
        },
      });
    }

    // Delete all existing entries for this report to ensure clean overwrite
    await prisma.reportEntry.deleteMany({
      where: { reportId: report.id },
    });

    // Create new entries for all submitted entries
    for (const entry of body.entries || []) {
      await prisma.reportEntry.create({
        data: {
          reportId: report.id,
          classId: entry.classId,
          subjectId: entry.subjectId,
          description: entry.description,
          isCompleted: entry.isCompleted,
          
        },
      });
    }

    const updated = await prisma.dailyReport.update({
      where: { id: report.id },
      data: {
        status: body.status ?? 'SUBMITTED',
        submittedAt: body.status === 'SUBMITTED' ? new Date() : report.submittedAt,
      },
      include: reportInclude,
    });

    return NextResponse.json(mapReportResponse(updated));
  } catch (error) {
    return handleApiError(error);
  }
}