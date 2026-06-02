import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { mapReportResponse } from '@/lib/report-utils';
import type { DailyReportStatus } from '@prisma/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    const { id } = await context.params;
    const body = await request.json();

    const report = await prisma.dailyReport.findFirst({
      where: { id, ...schoolWhere(schoolId) },
      include: { teacher: true },
    });

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({
        where: { schoolId, email: user.email },
      });
      if (!teacher || teacher.id !== report.teacherId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (report.status === 'SUBMITTED' && body.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Submitted reports cannot be edited' },
          { status: 400 }
        );
      }
    } else if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (Array.isArray(body.entries)) {
      for (const entry of body.entries) {
        if (!entry.id) continue;
        await prisma.reportEntry.updateMany({
          where: { id: String(entry.id), reportId: id },
          data: {
            ...(typeof entry.description === 'string'
              ? { description: entry.description }
              : {}),
            ...(typeof entry.isCompleted === 'boolean'
              ? { isCompleted: entry.isCompleted }
              : {}),
          },
        });
      }
    }

    const statusUpdate: DailyReportStatus | undefined =
      body.status === 'SUBMITTED'
        ? 'SUBMITTED'
        : body.status === 'DRAFT'
          ? 'DRAFT'
          : undefined;

    const updated = await prisma.dailyReport.update({
      where: { id },
      data: {
        ...(statusUpdate ? { status: statusUpdate } : {}),
        ...(statusUpdate === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
      },
      include: {
        teacher: true,
        entries: { include: { class: true, subject: true } },
      },
    });

    return NextResponse.json(mapReportResponse(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
