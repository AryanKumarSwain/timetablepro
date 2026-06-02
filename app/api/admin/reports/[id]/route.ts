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
