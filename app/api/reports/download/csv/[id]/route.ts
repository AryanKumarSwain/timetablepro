import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere, getSchoolPlan } from '@/lib/auth-server';

function parseDescription(desc = '') {
  const marker = '\n\nTLM:';
  const idx = desc.indexOf(marker);
  if (idx === -1) {
    return { description: desc, tlm: '' };
  }
  return {
    description: desc.slice(0, idx),
    tlm: desc.slice(idx + marker.length).trim(),
  };
}

function buildCsv(reports: Array<{ teacherName: string; reportDate: Date; status: string; submittedAt: Date | null; entries: Array<{ className: string; subjectName: string; description: string; entryType?: string; activityCategory?: string; activityDescription?: string; learningOutcome?: string; evidenceFiles?: any[] }> }> ) {
  const header = 'Teacher,Date,Class,Subject,Type,Description,TLM,Activity Category,Activity Description,Learning Outcome,Evidence Files,Status,SubmittedAt';
  const rows = reports.flatMap((report) =>
    report.entries.map((entry) => {
      const { description, tlm } = parseDescription(entry.description);
      const escaped = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const isActivity = entry.entryType === 'ACTIVITY';
      
      // Format evidence files as comma-separated list
      const evidenceFilesText = entry.evidenceFiles && entry.evidenceFiles.length > 0
        ? entry.evidenceFiles.map(f => typeof f === 'string' ? f : f.url).join(', ')
        : '';

      return [
        escaped(report.teacherName),
        escaped(report.reportDate.toISOString().split('T')[0]),
        escaped(entry.className),
        escaped(entry.subjectName),
        escaped(isActivity ? 'Activity' : 'Lesson'),
        escaped(isActivity ? '' : description),
        escaped(isActivity ? '' : tlm),
        escaped(isActivity ? (entry.activityCategory || '') : ''),
        escaped(isActivity ? (entry.activityDescription || '') : ''),
        escaped(isActivity ? (entry.learningOutcome || '') : ''),
        escaped(evidenceFilesText),
        escaped(report.status),
        escaped(report.submittedAt ? report.submittedAt.toISOString() : ''),
      ].join(',');
    })
  );
  return [header, ...rows].join('\n');
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    // Isolate pure YYYY-MM-DD date segments to ensure pristine parsing 
    const cleanId = id.includes('T') ? id.split('T')[0] : id;

    // Create timezone-insensitive absolute boundaries for the target day
    const startDate = new Date(`${cleanId}T00:00:00.000Z`);
    const endDate = new Date(`${cleanId}T23:59:59.999Z`);

    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format provided' }, { status: 400 });
    }

    const reports = await prisma.dailyReport.findMany({
      where: {
        ...schoolWhere(schoolId),
        reportDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        teacher: true,
        entries: { include: { class: true, subject: true } },
      },
      orderBy: { teacher: { name: 'asc' } },
    });

    if (reports.length === 0) {
      return NextResponse.json({ error: 'No reports found for this date' }, { status: 404 });
    }

    const csv = buildCsv(
      reports.map((report) => ({
        teacherName: report.teacher.name,
        reportDate: report.reportDate,
        status: report.status,
        submittedAt: report.submittedAt,
        entries: report.entries.map((entry) => ({
          className: entry.class.name,
          subjectName: entry.subject.name,
          description: entry.description,
          entryType: entry.entryType,
          activityCategory: entry.activityCategory,
          activityDescription: entry.activityDescription,
          learningOutcome: entry.learningOutcome,
          evidenceFiles: entry.evidenceFiles,
        })),
      }))
    );

    // Check if watermark is required based on plan
    const plan = await getSchoolPlan();
    const watermarkRequired = plan?.watermarkRequired !== false;
    
    // Add watermark if required
    const finalCsv = watermarkRequired 
      ? csv + '\n\n"Generated via Timetable Pro"' 
      : csv;

    const filename = `reports-${cleanId}.csv`;
    return new NextResponse(finalCsv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}