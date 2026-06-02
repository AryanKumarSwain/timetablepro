import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { reportToCsv } from '@/lib/report-utils';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    const report = await prisma.dailyReport.findFirst({
      where: { id, ...schoolWhere(schoolId) },
      include: {
        teacher: true,
        entries: { include: { class: true, subject: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const csv = reportToCsv(report);
    const filename = `report-${report.teacher.name.replace(/\s+/g, '-')}-${report.reportDate.toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
