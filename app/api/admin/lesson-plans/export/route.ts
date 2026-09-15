import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
  Header,
  Footer,
} from 'docx';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, requireExportAccess } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/lesson-plans/export
 * Export lesson plans as CSV, Word (DOCX), or PDF
 * Query params: teacherId, classId, subjectId, dateFrom, dateTo, format (csv/docx/pdf)
 */
export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const rawFormat = (searchParams.get('format') || 'csv').toLowerCase().trim();
    const format = rawFormat === 'word' || rawFormat === 'docx' ? 'docx' : rawFormat === 'pdf' ? 'pdf' : 'csv';

    const { watermarkRequired } = await requireExportAccess(format);

    const where: any = {
      schoolId,
    };

    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (dateFrom || dateTo) {
      where.planDate = {};
      if (dateFrom) where.planDate.gte = dateFrom;
      if (dateTo) where.planDate.lte = dateTo;
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        teacher: true,
        class: true,
        subject: true,
        period: true,
      },
      orderBy: { planDate: 'desc' },
    });

    const schoolName = school?.name || 'School';
    const dateRangeLabel = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom || dateTo || 'All dates';

    // ── CSV EXPORT ──────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const csvHeaders = [
        'Date',
        'Teacher',
        'Class',
        'Subject',
        'Period',
        'Lesson Title',
        'Topic',
        'Chapter',
        'Status',
      ].join(',');

      const csvRows = lessonPlans.map((plan) =>
        [
          plan.planDate,
          `"${(plan.teacher?.name || '').replace(/"/g, '""')}"`,
          `"${(plan.class?.name || '').replace(/"/g, '""')}"`,
          `"${(plan.subject?.name || '').replace(/"/g, '""')}"`,
          `"${plan.period?.startTime || ''} - ${plan.period?.endTime || ''}"`,
          `"${(plan.lessonTitle || '').replace(/"/g, '""')}"`,
          `"${(plan.topic || '').replace(/"/g, '""')}"`,
          `"${(plan.chapter || '').replace(/"/g, '""')}"`,
          plan.status,
        ].join(',')
      );

      let csvContent = '\uFEFF' + [csvHeaders, ...csvRows].join('\n');
      if (watermarkRequired) {
        csvContent += '\n\n"# Generated via TimetablePro [Watermarked Plan - Upgrade to remove watermark]"\n';
      }

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="lesson-plans.csv"',
        },
      });
    }

    // ── WORD (DOCX) EXPORT ──────────────────────────────────────────────────────
    if (format === 'docx') {
      const documentChildren: any[] = [];

      if (watermarkRequired) {
        documentChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '⚠️ GENERATED VIA TIMETABLEPRO • WATERMARKED EDITION (UPGRADE PLAN TO REMOVE)',
                size: 16,
                bold: true,
                color: '718096',
              }),
            ],
            spacing: { after: 150 },
          })
        );
      }

      documentChildren.push(
        new Paragraph({
          text: schoolName.toUpperCase(),
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'LESSON PLANS CURRICULUM ARCHIVE',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Period Range: ', bold: true }),
            new TextRun({ text: `${dateRangeLabel}    |    ` }),
            new TextRun({ text: 'Total Lessons: ', bold: true }),
            new TextRun({ text: `${lessonPlans.length}` }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        })
      );

      const tableRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 1200, type: WidthType.DXA },
              shading: { fill: '2563EB' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, color: 'FFFFFF' })] })],
            }),
            new TableCell({
              width: { size: 1800, type: WidthType.DXA },
              shading: { fill: '2563EB' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Teacher', bold: true, color: 'FFFFFF' })] })],
            }),
            new TableCell({
              width: { size: 1600, type: WidthType.DXA },
              shading: { fill: '2563EB' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Class & Subject', bold: true, color: 'FFFFFF' })] })],
            }),
            new TableCell({
              width: { size: 3800, type: WidthType.DXA },
              shading: { fill: '2563EB' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Lesson Details / Topic', bold: true, color: 'FFFFFF' })] })],
            }),
            new TableCell({
              width: { size: 1200, type: WidthType.DXA },
              shading: { fill: '2563EB' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF' })] })],
            }),
          ],
        }),
      ];

      lessonPlans.forEach((plan, idx) => {
        const bg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
        const details = [
          plan.lessonTitle || '-',
          plan.topic ? `Topic: ${plan.topic}` : '',
          plan.chapter ? `Chapter: ${plan.chapter}` : '',
        ].filter(Boolean).join('\n');

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ shading: { fill: bg }, children: [new Paragraph({ text: plan.planDate })] }),
              new TableCell({ shading: { fill: bg }, children: [new Paragraph({ text: plan.teacher?.name || 'Faculty' })] }),
              new TableCell({
                shading: { fill: bg },
                children: [
                  new Paragraph({ children: [new TextRun({ text: plan.class?.name || 'N/A', bold: true })] }),
                  new Paragraph({ text: plan.subject?.name || 'N/A' }),
                ],
              }),
              new TableCell({
                shading: { fill: bg },
                children: details.split('\n').map((l) => new Paragraph({ text: l })),
              }),
              new TableCell({ shading: { fill: bg }, children: [new Paragraph({ text: plan.status })] }),
            ],
          })
        );
      });

      documentChildren.push(
        new Table({
          rows: tableRows,
          width: { size: 9600, type: WidthType.DXA },
        })
      );

      if (watermarkRequired) {
        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Generated via TimetablePro • Watermarked Edition',
                italics: true,
                color: '94A3B8',
                size: 16,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300 },
          })
        );
      }

      const doc = new Document({
        sections: [{
          properties: {},
          headers: watermarkRequired ? {
            default: new Header({
              children: [
                new Paragraph({
                  text: 'TIMETABLEPRO WATERMARK',
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: 'TIMETABLEPRO WATERMARK', color: 'CBD5E1', size: 16, bold: true })],
                }),
              ],
            }),
          } : undefined,
          children: documentChildren,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="lesson-plans.docx"',
        },
      });
    }

    // ── PDF EXPORT ──────────────────────────────────────────────────────────────
    if (format === 'pdf') {
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

          doc.rect(0, 0, doc.page.width, 6).fill('#2563EB');

          doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(18).text(schoolName, left, 25);
          doc.fillColor('#2563EB').font('Helvetica-Bold').fontSize(10).text(`LESSON PLANS  |  ${dateRangeLabel.toUpperCase()}`, left, 46);
          doc.moveTo(left, 62).lineTo(left + pageWidth, 62).lineWidth(1).stroke('#E5E7EB');
          doc.y = 75;

          const PAGE_BOTTOM = doc.page.height - doc.page.margins.bottom - 20;
          const ensureSpace = (needed: number) => {
            if (doc.y + needed > PAGE_BOTTOM) {
              doc.addPage();
              doc.y = doc.page.margins.top + 10;
            }
          };

          lessonPlans.forEach((plan, idx) => {
            ensureSpace(50);
            const startY = doc.y;

            doc.roundedRect(left, startY, pageWidth, 20, 3).fill('#F1F5F9');
            doc
              .fillColor('#1F2937')
              .font('Helvetica-Bold')
              .fontSize(9)
              .text(
                `${idx + 1}. ${plan.planDate} — ${plan.teacher?.name || 'Faculty'} — ${plan.class?.name || 'Class'} (${plan.subject?.name || 'Subject'})`,
                left + 6,
                startY + 5
              );

            doc
              .fillColor(plan.status === 'COMPLETED' ? '#059669' : '#D97706')
              .font('Helvetica-Bold')
              .fontSize(8)
              .text(plan.status, left + pageWidth - 80, startY + 5, { align: 'right', width: 70 });

            doc.y = startY + 24;

            doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5).text(`Title: ${plan.lessonTitle}`, left + 12, doc.y);
            doc.y += 12;

            if (plan.topic || plan.chapter) {
              doc
                .fillColor('#64748B')
                .font('Helvetica')
                .fontSize(8)
                .text(`Topic: ${plan.topic || '-'}   |   Chapter: ${plan.chapter || '-'}`, left + 12, doc.y);
              doc.y += 12;
            }

            doc.y += 6;
          });

          // Watermark & Footer
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
            doc.moveTo(left, footerY - 6).lineTo(left + pageWidth, footerY - 6).lineWidth(0.5).stroke('#E5E7EB');

            const footerText = watermarkRequired
              ? 'Generated via TimetablePro • Watermarked Edition'
              : `Lesson Plans Archive • ${schoolName}`;

            doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text(footerText, left, footerY, { width: pageWidth / 2, lineBreak: false });
            doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text(`Page ${i - range.start + 1} of ${range.count}`, left, footerY, { width: pageWidth, align: 'right', lineBreak: false });
          }

          doc.end();
        } catch (e) {
          reject(e);
        }
      });

      return new Response(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="lesson-plans.pdf"',
        },
      });
    }

    return NextResponse.json(lessonPlans);
  } catch (error) {
    return handleApiError(error);
  }
}
