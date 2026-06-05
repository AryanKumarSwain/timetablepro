import { NextResponse } from 'next/server';
// @ts-ignore - Standalone bundle lacks declaration files but runs perfectly in Node runtime
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    const report = await prisma.dailyReport.findFirst({
      where: {
        id,
        ...schoolWhere(schoolId)
      },
      include: {
        teacher: true,
        entries: { include: { class: true, subject: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report entry not found' }, { status: 404 });
    }

    // Wrap the entire PDF generation in a robust Try/Catch within the Promise
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        // @ts-ignore - Standalone bundle lacks declaration files but runs perfectly in Node runtime
        const doc = new PDFDocument({ margin: 50 });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // Header Layout Rendering
        doc.fontSize(20).text('Daily Teaching Report', { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(11).fillColor('#4B5563').text(`Report Meta Reference ID: ${report.id}`);
        doc.moveDown(0.5);

        doc.fontSize(12).fillColor('#1F2937');
        doc.text(`Teacher Profile: ${report.teacher?.name || 'N/A'}`);
        doc.text(`Registered Contact: ${report.teacher?.email || 'N/A'}`);

        // Bulletproof date parsing
        let cleanDate = 'N/A';
        try {
          if (report.reportDate) {
            cleanDate = new Date(report.reportDate).toISOString().split('T')[0];
          }
        } catch (e) {
          cleanDate = 'Invalid Date';
        }

        doc.text(`Target Date: ${cleanDate}`);
        doc.text(`Workflow State: ${report.status || 'DRAFT'}`);

        if (report.submittedAt) {
          try {
            doc.text(`Timestamp Verification: ${new Date(report.submittedAt).toLocaleString()}`);
          } catch (e) {
            doc.text(`Timestamp Verification: Unreadable timestamp`);
          }
        }

        doc.moveDown(1.5);
        doc.fontSize(14).text('Lesson Entry Log Matrix', { underline: true });
        doc.moveDown(0.5);

        // Check if entries exist safely
        if (Array.isArray(report.entries) && report.entries.length > 0) {
          report.entries.forEach((entry, index) => {
            doc.fontSize(11).fillColor('#1F2937').text(
              `${index + 1}. Grade/Class: ${entry.class?.name || 'N/A'} · Subject Core: ${entry.subject?.name || 'N/A'}`
            );
            doc.fontSize(10).fillColor('#6B7280').text(`   Class Status: ${entry.isCompleted ? 'Completed' : 'Incomplete / Pending'}`);
            doc.fillColor('#1F2937').text(`   Logged Entry Summary: ${entry.description || '(No structured details provided)'}`);
            doc.moveDown(0.8);
          });
        } else {
          doc.fontSize(11).fillColor('#6B7280').text('No structured lessons recorded for this deployment block.');
        }

        doc.end();
      } catch (promiseError) {
        reject(promiseError);
      }
    });

    const cleanTeacherName = (report.teacher?.name || 'Faculty').replace(/\s+/g, '-');

    let cleanDateString = 'export';
    try {
      if (report.reportDate) cleanDateString = new Date(report.reportDate).toISOString().split('T')[0];
    } catch (e) { }

    const filename = `report-${cleanTeacherName}-${cleanDateString}.pdf`;

    // FIX: Pass the native Node Buffer instance directly into the constructor 
    // instead of wrapping it into an explicit custom Uint8Array array boundary.
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[PDF Generation Error]:', error);
    return handleApiError(error);
  }
}