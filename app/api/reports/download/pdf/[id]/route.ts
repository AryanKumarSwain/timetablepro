import { NextResponse } from 'next/server';
// @ts-ignore
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere, requireExportAccess } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const COLORS = {
  brand: '#2563EB',
  brandDark: '#1E40AF',
  heading: '#1F2937',
  body: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  cardBg: '#F8FAFC',
  cardHeader: '#F1F5F9',
  success: '#059669',
  successBg: '#D1FAE5',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  white: '#FFFFFF',
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { watermarkRequired } = await requireExportAccess('pdf');
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const cleanId = id.includes('T') ? id.split('T')[0] : id;
    const startDate = new Date(`${cleanId}T00:00:00.000Z`);
    const endDate = new Date(`${cleanId}T23:59:59.999Z`);

    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format provided' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

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

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        // @ts-ignore
        const doc = new PDFDocument({ margin: 36, size: 'A4', bufferPages: true });
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // Header band
        doc.rect(0, 0, doc.page.width, 6).fill(COLORS.brand);

        // Title
        doc
          .fillColor(COLORS.heading)
          .font('Helvetica-Bold')
          .fontSize(18)
          .text(school?.name || 'School Daily Reports', left, 25);

        doc
          .fillColor(COLORS.brand)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`DATE: ${cleanId}   |   TOTAL FACULTY REPORTS: ${reports.length}`, left, 46);

        doc.moveTo(left, 62).lineTo(left + pageWidth, 62).lineWidth(1).stroke(COLORS.border);
        doc.y = 75;

        const PAGE_BOTTOM = doc.page.height - doc.page.margins.bottom - 20;

        const ensureSpace = (needed: number) => {
          if (doc.y + needed > PAGE_BOTTOM) {
            doc.addPage();
            doc.y = doc.page.margins.top + 10;
          }
        };

        reports.forEach((report, rIdx) => {
          ensureSpace(70);

          // Teacher subheader
          const startY = doc.y;
          doc.roundedRect(left, startY, pageWidth, 24, 4).fill(COLORS.cardHeader);
          doc
            .fillColor(COLORS.heading)
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(
              `${rIdx + 1}. ${report.teacher?.name || 'Teacher'} (${report.teacher?.email || 'N/A'})`,
              left + 8,
              startY + 7
            );

          const statusBadge = report.status || 'DRAFT';
          doc
            .fillColor(statusBadge === 'SUBMITTED' ? COLORS.success : COLORS.warning)
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(statusBadge, left + pageWidth - 80, startY + 7, { align: 'right', width: 70 });

          doc.y = startY + 30;

          if (report.entries && report.entries.length > 0) {
            report.entries.forEach((entry, eIdx) => {
              ensureSpace(35);
              const ey = doc.y;
              const isActivity = entry.entryType === 'ACTIVITY';

              doc
                .fillColor(isActivity ? '#9333EA' : COLORS.brand)
                .font('Helvetica-Bold')
                .fontSize(9)
                .text(
                  `• ${entry.class?.name || 'N/A'} - ${entry.subject?.name || 'N/A'} [${isActivity ? 'Activity' : 'Lesson'}]`,
                  left + 12,
                  ey
                );

              doc
                .fillColor(COLORS.body)
                .font('Helvetica')
                .fontSize(8.5)
                .text(
                  isActivity
                    ? `${entry.activityCategory || 'General'}: ${entry.activityDescription || entry.description || '-'}`
                    : (entry.description || '-'),
                  left + 22,
                  ey + 12,
                  { width: pageWidth - 30 }
                );

              doc.y = doc.y + 6;
            });
          } else {
            doc
              .fillColor(COLORS.muted)
              .font('Helvetica-Oblique')
              .fontSize(8.5)
              .text('No entries recorded.', left + 12, doc.y);
            doc.y += 8;
          }

          doc.y += 10;
        });

        // Watermark & Footers on all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);

          if (watermarkRequired) {
            doc.save();
            doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
            doc
              .font('Helvetica-Bold')
              .fontSize(38)
              .fillColor('#64748B', 0.10)
              .text('TIMETABLEPRO • WATERMARK', 0, doc.page.height / 2 - 20, {
                width: doc.page.width,
                align: 'center',
                lineBreak: false,
              });
            doc.restore();
          }

          const footerY = doc.page.height - doc.page.margins.bottom + 8;
          doc.moveTo(left, footerY - 6).lineTo(left + pageWidth, footerY - 6).lineWidth(0.5).stroke(COLORS.border);

          const footerText = watermarkRequired
            ? 'Generated via TimetablePro • Watermarked Edition'
            : `School Reports Archive • ${cleanId}`;

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(COLORS.muted)
            .text(footerText, left, footerY, { width: pageWidth / 2, lineBreak: false });

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(COLORS.muted)
            .text(`Page ${i - range.start + 1} of ${range.count}`, left, footerY, {
              width: pageWidth,
              align: 'right',
              lineBreak: false,
            });
        }

        doc.end();
      } catch (promiseError) {
        reject(promiseError);
      }
    });

    const filename = `all-reports-${cleanId}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Date PDF Generation Error]:', error);
    return handleApiError(error);
  }
}
