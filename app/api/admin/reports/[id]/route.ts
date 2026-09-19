import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { mapReportResponse, reportToCsv } from '@/lib/report-utils';

type RouteContext = { params: Promise<{ id: string }> };

async function loadReport(schoolId: string, id: string) {
  return prisma.dailyReport.findFirst({
    where: { id, ...schoolWhere(schoolId) },
    include: {
      teacher: true,
      entries: { include: { class: true, subject: true } },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    const report = await loadReport(schoolId, id);
    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(mapReportResponse(report));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    const report = await prisma.dailyReport.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entries } = body;

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry.id) {
          await prisma.reportEntry.update({
            where: { id: entry.id },
            data: {
              ...(entry.description !== undefined && { description: entry.description }),
              ...(entry.isCompleted !== undefined && { isCompleted: entry.isCompleted }),
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

