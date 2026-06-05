import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

// Helper function to safely isolate Description segments and TLM tags from text strings
function parseDescription(desc = '') {
  const marker = '\n\nTLM:';
  const idx = desc.indexOf(marker);
  if (idx === -1) {
    return { description: desc, tlm: '' };
  }
  return {
    description: desc.slice(0, idx),
    tlm: desc.slice(marker.length + idx).trim(),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params; 

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
    
    // --- UPDATED CSV SCHEMA HEADER ---
    csvRows.push('Teacher Name,Status,Class,Subject,Description,TLM');

    const teacherName = `"${(report.teacher?.name || 'Unknown').replace(/"/g, '""')}"`;
    const status = `"${report.status || 'DRAFT'}"`;

    if (report.entries && report.entries.length > 0) {
      report.entries.forEach((entry) => {
        const className = `"${(entry.class?.name || 'N/A').replace(/"/g, '""')}"`;
        const subjectName = `"${(entry.subject?.name || 'N/A').replace(/"/g, '""')}"`;
        
        // Parse raw string down the middle into two standalone strings
        const { description, tlm } = parseDescription(entry.description || '');
        
        const escapedDescription = `"${description.replace(/"/g, '""')}"`;
        const escapedTlm = `"${tlm.replace(/"/g, '""')}"`;
        
        // Push rows matching structural field changes
        csvRows.push(`${teacherName},${status},${className},${subjectName},${escapedDescription},${escapedTlm}`);
      });
    } else {
      csvRows.push(`${teacherName},${status},"N/A","N/A","No daily items tracked",""`);
    }

    // CRITICAL FIX FOR EXCEL: Add UTF-8 BOM (\uFEFF) so Excel breaks columns cleanly
    const csvContent = '\uFEFF' + csvRows.join('\n');
    
    // Bulletproof date parsing to match the PDF fix
    let cleanDateString = 'export';
    try {
      if (report.reportDate) {
        cleanDateString = new Date(report.reportDate).toISOString().split('T')[0];
      }
    } catch (e) {
      cleanDateString = 'invalid-date';
    }

    const filename = `report-${(report.teacher?.name || 'teacher').replace(/\s+/g, '-')}-${cleanDateString}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[CSV Generation Error]:', error);
    return handleApiError(error);
  }
}