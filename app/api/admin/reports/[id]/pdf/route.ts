import { NextResponse } from 'next/server';
// @ts-ignore
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ---- Design tokens (Professional & Compact) ------------------------------
const COLORS = {
  brand: '#2563EB',
  brandDark: '#1E40AF',
  ink: '#111827',
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
    const { id } = await context.params;

    const report = await prisma.dailyReport.findFirst({
      where: {
        id,
        ...schoolWhere(schoolId),
      },
      include: {
        teacher: true,
        entries: { include: { class: true, subject: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report entry not found' }, { status: 404 });
    }

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        // @ts-ignore
        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true }); // Reduced page margin from 50 to 40
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // ---- Helpers -----------------------------------------------------
        const formatDate = (d: unknown, withTime = false) => {
          try {
            if (!d) return 'N/A';
            const date = new Date(d as string);
            if (withTime) {
              return date.toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
            }
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          } catch {
            return 'N/A';
          }
        };

        const drawStatusBadge = (
          text: string,
          x: number,
          y: number,
          fg: string,
          bg: string
        ) => {
          doc.font('Helvetica-Bold').fontSize(7.5);
          const padX = 8; // Reduced padding
          const textWidth = doc.widthOfString(text.toUpperCase());
          const w = textWidth + padX * 2;
          const h = 15; // Reduced badge height
          
          doc.roundedRect(x, y, w, h, h / 2).fill(bg);
          doc.fillColor(fg).text(text.toUpperCase(), x + padX, y + 4.5, {
            lineBreak: false,
          });
          return w;
        };

        const parseEntryDescription = (raw = '') => {
          const homeworkMarker = '\n\nHomework:';
          const tlmMarker = '\n\nTLM:';
          const homeworkIdx = raw.indexOf(homeworkMarker);
          const tlmIdx = raw.indexOf(tlmMarker);

          let description = raw.trim();
          let homework = '';
          let tlm = '';

          if (homeworkIdx === -1 && tlmIdx === -1) return { description, homework, tlm };

          if (homeworkIdx !== -1 && tlmIdx !== -1) {
            if (homeworkIdx < tlmIdx) {
              description = raw.slice(0, homeworkIdx).trim();
              homework = raw.slice(homeworkIdx + homeworkMarker.length, tlmIdx).trim();
              tlm = raw.slice(tlmIdx + tlmMarker.length).trim();
            } else {
              description = raw.slice(0, tlmIdx).trim();
              tlm = raw.slice(tlmIdx + tlmMarker.length, homeworkIdx).trim();
              homework = raw.slice(homeworkIdx + homeworkMarker.length).trim();
            }
          } else if (homeworkIdx !== -1) {
            description = raw.slice(0, homeworkIdx).trim();
            homework = raw.slice(homeworkIdx + homeworkMarker.length).trim();
          } else {
            description = raw.slice(0, tlmIdx).trim();
            tlm = raw.slice(tlmIdx + tlmMarker.length).trim();
          }

          return {
            description: description || '-',
            homework: homework || '-',
            tlm: tlm || '-',
          };
        };

        // ---- Header band (Compact) ---------------------------------------
        doc.rect(0, 0, doc.page.width, 5).fill(COLORS.brand);

        const headerY = 25; // Moved up
        
        doc
          .fillColor(COLORS.heading)
          .font('Helvetica-Bold')
          .fontSize(20) // Slightly smaller header
          .text('Daily Teaching Report', left, headerY);

        doc.y = headerY + 4;
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(COLORS.brand)
          .text(formatDate(report.reportDate).toUpperCase(), left, doc.y, { align: 'right', width: pageWidth });
          
        doc.y = headerY + 16;
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(COLORS.muted)
          .text(`REF ID: ${report.id}`, left, doc.y, { align: 'right', width: pageWidth });

        doc.moveTo(left, headerY + 32).lineTo(left + pageWidth, headerY + 32).lineWidth(1).stroke(COLORS.border);

        doc.y = headerY + 44; // Reduced gap before teacher info
        doc.x = left;

        // ---- Teacher info section (Compact block) -------------------------
        const cardTop = doc.y;
        const cardPadding = 10; // Reduced padding
        const infoLineHeight = 14; // Tighter lines
        const infoRows = [
          ['TEACHER', report.teacher?.name || 'N/A'],
          ['EMAIL', report.teacher?.email || 'N/A'],
          ['SUBMITTED', report.submittedAt ? formatDate(report.submittedAt, true) : 'Not submitted'],
        ];
        
        const infoCardHeight = (cardPadding * 2) + (infoRows.length * infoLineHeight) - 4;

        doc.roundedRect(left, cardTop, pageWidth, infoCardHeight, 6).fill(COLORS.cardBg);

        let infoY = cardTop + cardPadding;
        const labelWidth = 85;
        
        infoRows.forEach(([label, value]) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .fillColor(COLORS.muted)
            .text(label, left + cardPadding, infoY, { width: labelWidth, lineBreak: false });
          doc
            .font('Helvetica')
            .fontSize(9.5)
            .fillColor(COLORS.ink)
            .text(value, left + cardPadding + labelWidth, infoY - 0.5, {
              width: pageWidth - cardPadding * 2 - labelWidth - 80,
              lineBreak: false,
            });
          infoY += infoLineHeight;
        });

        const statusText = report.status || 'DRAFT';
        const isDone = statusText.toUpperCase() === 'SUBMITTED';
        doc.font('Helvetica-Bold').fontSize(7.5);
        const badgeW = doc.widthOfString(statusText.toUpperCase()) + 16;
        
        drawStatusBadge(
          statusText,
          left + pageWidth - cardPadding - badgeW,
          cardTop + cardPadding,
          isDone ? COLORS.success : COLORS.warning,
          isDone ? COLORS.successBg : COLORS.warningBg
        );

        doc.y = cardTop + infoCardHeight + 20; // Reduced spacing after teacher card
        doc.x = left;

        // ---- Section title (Compact) -----------------------------------------
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor(COLORS.heading)
          .text('Lesson Entries', left, doc.y, { width: pageWidth });
          
        doc.moveDown(0.2);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.body)
          .text(
            `${report.entries?.length || 0} ${report.entries?.length === 1 ? 'entry' : 'entries'} recorded for this session`,
            left
          );
        doc.moveDown(0.8); // Reduced gap before entries

        const PAGE_BOTTOM = doc.page.height - doc.page.margins.bottom;

        const ensureSpace = (needed: number) => {
          if (doc.y + needed > PAGE_BOTTOM) {
            doc.addPage();
            doc.y = doc.page.margins.top;
          }
        };

        if (Array.isArray(report.entries) && report.entries.length > 0) {
          report.entries.forEach((entry: any, index: number) => {
            const parsed = parseEntryDescription(entry.description || '');
            const summary = parsed.description || '-';
            const homework = parsed.homework || '-';
            const tlm = parsed.tlm || '-';

            // Layout metrics (Tighter)
            const padX = 12;
            const padY = 10;
            const gap = 12;
            const innerWidth = pageWidth - (padX * 2);
            const colWidth = (innerWidth - (gap * 2)) / 3;

            doc.font('Helvetica').fontSize(9);
            const textOpts = { width: colWidth, lineGap: 2.5 }; // Reduced line gap
            
            const sumH = doc.heightOfString(summary, textOpts);
            const hwH = doc.heightOfString(homework, textOpts);
            const tlmH = doc.heightOfString(tlm, textOpts);
            const maxTextH = Math.max(sumH, hwH, tlmH);

            const headerH = 30; // Thinner card header
            const estCardHeight = headerH + 18 + maxTextH + padY;

            ensureSpace(estCardHeight + 12);

            const startY = doc.y;
            const completed = !!entry.isCompleted;

            // Main Card Box
            doc
              .roundedRect(left, startY, pageWidth, estCardHeight, 6)
              .fill(COLORS.white)
              .lineWidth(1)
              .roundedRect(left, startY, pageWidth, estCardHeight, 6)
              .stroke(COLORS.border);
              
            // Card Header Background
            doc
              .roundedRect(left, startY, pageWidth, headerH, 6)
              .fill(COLORS.cardHeader);
            
            doc.rect(left, startY + headerH - 6, pageWidth, 6).fill(COLORS.cardHeader);
            
            // Accent Line
            doc.rect(left, startY, 4, headerH).fill(completed ? COLORS.success : COLORS.brand);
            doc.circle(left + 4, startY + 4, 4).fill(completed ? COLORS.success : COLORS.brand);
            doc.rect(left, startY, 4, 4).fill(completed ? COLORS.success : COLORS.brand);

            // Title & Status Badge
            const cy = startY + 10;
            const titleText = `${entry.class?.name || 'N/A'}  —  ${entry.subject?.name || 'N/A'}`;
            
            doc
              .font('Helvetica-Bold')
              .fontSize(10.5)
              .fillColor(COLORS.heading)
              .text(`Entry ${index + 1}:  `, left + padX, cy, { continued: true })
              .font('Helvetica')
              .text(titleText);

            const entryBadgeText = completed ? 'Completed' : 'Pending';
            doc.font('Helvetica-Bold').fontSize(7.5);
            const entryBadgeW = doc.widthOfString(entryBadgeText.toUpperCase()) + 16;
            
            drawStatusBadge(
              entryBadgeText,
              left + pageWidth - 10 - entryBadgeW,
              startY + 7.5,
              completed ? COLORS.success : COLORS.warning,
              completed ? COLORS.successBg : COLORS.warningBg
            );

            // Bottom border for header
            doc
              .moveTo(left, startY + headerH)
              .lineTo(left + pageWidth, startY + headerH)
              .lineWidth(1)
              .stroke(COLORS.borderLight);

            // Column Labels
            const colsY = startY + headerH + 8;
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted);
            
            const col1X = left + padX;
            const col2X = col1X + colWidth + gap;
            const col3X = col2X + colWidth + gap;

            doc.text('SUMMARY', col1X, colsY, { width: colWidth, characterSpacing: 0.5 });
            doc.text('HOMEWORK', col2X, colsY, { width: colWidth, characterSpacing: 0.5 });
            doc.text('TLM / RESOURCES', col3X, colsY, { width: colWidth, characterSpacing: 0.5 });

            // Column Content Texts
            const textY = colsY + 12;
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.body);

            doc.text(summary, col1X, textY, textOpts);
            doc.text(homework, col2X, textY, textOpts);
            doc.text(tlm, col3X, textY, textOpts);

            doc.y = startY + estCardHeight + 12; // Tighter gap between cards
            doc.x = left;
          });
        } else {
          ensureSpace(50);
          doc
            .roundedRect(left, doc.y, pageWidth, 50, 6)
            .fill(COLORS.cardBg)
            .lineWidth(1)
            .stroke(COLORS.borderLight);
            
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(COLORS.muted)
            .text('No structured lessons recorded for this session.', left, doc.y + 19, {
              width: pageWidth,
              align: 'center'
            });
          doc.y += 60;
        }

        // ---- Footer --------------------------------------------------------
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          const footerY = doc.page.height - doc.page.margins.bottom + 12; // Moved up slightly
          
          doc.moveTo(left, footerY - 8).lineTo(left + pageWidth, footerY - 8).lineWidth(0.5).stroke(COLORS.border);
          
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(COLORS.muted)
            .text(
              `Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`,
              left,
              footerY,
              { width: pageWidth / 2, lineBreak: false }
            );
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

    const cleanTeacherName = (report.teacher?.name || 'Faculty').replace(/\s+/g, '-');

    let cleanDateString = 'export';
    try {
      if (report.reportDate) cleanDateString = new Date(report.reportDate).toISOString().split('T')[0];
    } catch (e) {
      /* noop */
    }

    const filename = `report-${cleanTeacherName}-${cleanDateString}.pdf`;

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