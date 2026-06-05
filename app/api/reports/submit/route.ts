import { NextRequest, NextResponse } from 'next/server';
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

// Generates a pure UTC Midnight date from local calendar parts
function getAbsoluteDate(dateParam?: string) {
  let yyyy: number, mm: number, dd: number;

  if (!dateParam || dateParam === 'today') {
    const now = new Date();
    yyyy = now.getFullYear();
    mm = now.getMonth() + 1;
    dd = now.getDate();
  } else {
    const parts = dateParam.split('T')[0].split('-');
    yyyy = parseInt(parts[0], 10);
    mm = parseInt(parts[1], 10);
    dd = parseInt(parts[2], 10);
  }

  return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
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
    const reportDate = getAbsoluteDate(body.date ? String(body.date) : 'today');
    
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

    for (const entry of body.entries || []) {
      if (entry.id) {
        await prisma.reportEntry.updateMany({
          where: { id: entry.id, reportId: report.id },
          data: {
            description: entry.description,
            isCompleted: entry.isCompleted,
          },
        });
      } else {
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