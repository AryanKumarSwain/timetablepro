import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params; // In this context, 'id' is actually the string date (e.g., "2026-06-03")

    // 1. Clean and normalize the date string
    const cleanDate = id.includes('T') ? id.split('T')[0] : id;
    const targetDate = new Date(cleanDate);

    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format provided' }, { status: 400 });
    }

    // 2. Fetch ALL submitted reports for this school on this specific date range
    const submittedReports = await prisma.dailyReport.findMany({
      where: {
        reportDate: {
          gte: new Date(`${cleanDate}T00:00:00.000Z`),
          lte: new Date(`${cleanDate}T23:59:59.999Z`),
        },
        status: 'SUBMITTED',
        ...schoolWhere(schoolId),
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

    // Track which teachers have already submitted
    const submittedTeacherIds = new Set(submittedReports.map((r) => String(r.teacherId)));

    // 3. Find the Active Schedule Layout to know who was SUPPOSED to submit
    // Note: This mirrors the desk grid generation logic you use on your frontend dialog
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    const activeLayout = await prisma.timetableLayout.findFirst({
      where: {
        isActive: true,
        ...schoolWhere(schoolId),
      },
      include: {
        rows: {
          include: {
            cells: {
              include: {
                teacher: true,
              },
            },
          },
        },
      },
    });

    // Extract all scheduled faculty allocations from the timetable matrix
    const scheduledTeachersMap = new Map<string, string>();
    if (activeLayout?.rows) {
      activeLayout.rows.forEach((row) => {
        if (row.cells) {
          row.cells.forEach((cell) => {
            if (cell && !cell.empty && cell.teacherId && cell.dayOfWeek === dayOfWeek) {
              scheduledTeachersMap.set(String(cell.teacherId), cell.teacher?.name || 'Unknown Faculty');
            }
          });
        }
      });
    }

    // 4. Build the custom CSV content array manually to manage "Pending" items cleanly
    const csvRows: string[] = [];
    
    // Header block
    csvRows.push('Teacher Name,Status,Class,Subject,Lesson Description / TLM');

    // Group A: Append Submitted Reports with their corresponding inner details
    submittedReports.forEach((report) => {
      const teacherName = `"${(report.teacher?.name || 'Unknown').replace(/"/g, '""')}"`;
      
      if (report.entries && report.entries.length > 0) {
        report.entries.forEach((entry) => {
          const className = `"${(entry.class?.name || 'N/A').replace(/"/g, '""')}"`;
          const subjectName = `"${(entry.subject?.name || 'N/A').replace(/"/g, '""')}"`;
          const description = `"${(entry.description || 'No details provided').replace(/"/g, '""')}"`;
          
          csvRows.push(`${teacherName},"Submitted",${className},${subjectName},${description}`);
        });
      } else {
        csvRows.push(`${teacherName},"Submitted","N/A","N/A","No daily items tracked"`);
      }
    });

    // Group B: Append Pending / Absent Faculty entries who missed their submissions
    scheduledTeachersMap.forEach((teacherNameString, teacherId) => {
      if (!submittedTeacherIds.has(teacherId)) {
        const teacherName = `"${teacherNameString.replace(/"/g, '""')}"`;
        csvRows.push(`${teacherName},"Pending","N/A","N/A","No report submitted for this schedule date"`);
      }
    });

    // 5. Combine and deliver the streaming document string response
    const csvContent = csvRows.join('\n');
    const filename = `all-reports-${cleanDate}.csv`;

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