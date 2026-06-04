import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params; // This is the concrete Prisma report UUID string

    // Fetch the target report and its inner details
    const report = await prisma.dailyReport.findFirst({
      where: { 
        id, 
        ...schoolWhere(schoolId) 
      },
      include: {
        teacher: true,
        entries: {
          include: {
            class: true,
            subject: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const csvRows: string[] = [];
    
    // CSV Schema Column Headers
    csvRows.push('Teacher Name,Status,Class,Subject,Completion Status,Lesson Description');

    const teacherName = `"${(report.teacher?.name || 'Unknown').replace(/"/g, '""')}"`;
    const status = `"${report.status || 'DRAFT'}"`;

    if (report.entries && report.entries.length > 0) {
      report.entries.forEach((entry) => {
        const className = `"${(entry.class?.name || 'N/A').replace(/"/g, '""')}"`;
        const subjectName = `"${(entry.subject?.name || 'N/A').replace(/"/g, '""')}"`;
        const completed = entry.isCompleted ? 'Completed' : 'Pending';
        const description = `"${(entry.description || '').replace(/"/g, '""')}"`;
        
        csvRows.push(`${teacherName},${status},${className},${subjectName},${completed},${description}`);
      });
    } else {
      csvRows.push(`${teacherName},${status},"N/A","N/A","N/A","No daily items tracked"`);
    }

    const csvContent = csvRows.join('\n');
    const cleanDateString = report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : 'export';
    const filename = `report-${(report.teacher?.name || 'teacher').replace(/\s+/g, '-')}-${cleanDateString}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}