import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { formatReportDate } from '@/lib/report-utils';

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

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Daily Teaching Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Teacher: ${report.teacher.name}`);
      doc.text(`Email: ${report.teacher.email}`);
      doc.text(`Date: ${formatReportDate(report.reportDate)}`);
      doc.text(`Status: ${report.status}`);
      if (report.submittedAt) {
        doc.text(`Submitted: ${report.submittedAt.toLocaleString()}`);
      }
      doc.moveDown();

      doc.fontSize(14).text('Entries');
      doc.moveDown(0.5);

      report.entries.forEach((entry, index) => {
        doc.fontSize(11).text(
          `${index + 1}. ${entry.class.name} · ${entry.subject.name}`
        );
        doc.fontSize(10).text(`   Completed: ${entry.isCompleted ? 'Yes' : 'No'}`);
        doc.text(`   ${entry.description || '(No description)'}`);
        doc.moveDown(0.5);
      });

      doc.end();
    });

    const filename = `report-${report.teacher.name.replace(/\s+/g, '-')}-${formatReportDate(report.reportDate)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
