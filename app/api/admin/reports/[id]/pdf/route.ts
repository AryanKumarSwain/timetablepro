import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';

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

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header Layout Rendering
      doc.fontSize(20).text('Daily Teaching Report', { align: 'center' });
      doc.moveDown(1.5);
      
      doc.fontSize(11).fillColor('#4B5563').text(`Report Meta Reference ID: ${report.id}`);
      doc.moveDown(0.5);
      
      doc.fontSize(12).fillColor('#1F2937');
      doc.text(`Teacher Profile: ${report.teacher?.name || 'N/A'}`);
      doc.text(`Registered Contact: ${report.teacher?.email || 'N/A'}`);
      
      const cleanDate = report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : 'N/A';
      doc.text(`Target Date: ${cleanDate}`);
      doc.text(`Workflow State: ${report.status || 'DRAFT'}`);
      
      if (report.submittedAt) {
        doc.text(`Timestamp Verification: ${new Date(report.submittedAt).toLocaleString()}`);
      }
      
      doc.moveDown(1.5);
      doc.fontSize(14).text('Lesson Entry Log Matrix', { underline: true });
      doc.moveDown(0.5);

      if (report.entries && report.entries.length > 0) {
        report.entries.forEach((entry, index) => {
          doc.fontSize(11).text(
            `${index + 1}. Grade/Class: ${entry.class?.name || 'N/A'} · Subject Core: ${entry.subject?.name || 'N/A'}`
          );
          doc.fontSize(10).fillColor('#6B7280').text(`   Class Status: ${entry.isCompleted ? 'Completed' : 'Incomplete / Pending'}`);
          doc.fillColor('#1F2937').text(`   Logged Entry Summary: ${entry.description || '(No structured details provided)'}`);
          doc.moveDown(0.8);
        });
      } else {
        doc.fontSize(11).text('No structured lessons recorded for this deployment block.');
      }

      doc.end();
    });

    const cleanTeacherName = (report.teacher?.name || 'Faculty').replace(/\s+/g, '-');
    const cleanDateString = report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : 'export';
    const filename = `report-${cleanTeacherName}-${cleanDateString}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}