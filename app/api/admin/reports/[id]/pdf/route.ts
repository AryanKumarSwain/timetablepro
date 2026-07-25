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
        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
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
          const padX = 8;
          const textWidth = doc.widthOfString(text.toUpperCase());
          const w = textWidth + padX * 2;
          const h = 15;
          
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

        const headerY = 25;
        
        doc
          .fillColor(COLORS.heading)
          .font('Helvetica-Bold')
          .fontSize(20)
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

        doc.y = headerY + 44;
        doc.x = left;

        // ---- Teacher info section (Compact block) -------------------------
        const cardTop = doc.y;
        const cardPadding = 10;
        const infoLineHeight = 14;
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

        doc.y = cardTop + infoCardHeight + 20;
        doc.x = left;

        // ---- Section title (Compact) -----------------------------------------
        const lessonsCount = report.entries?.filter((e: any) => e.entryType === 'LESSON' || !e.entryType).length || 0;
        const activitiesCount = report.entries?.filter((e: any) => e.entryType === 'ACTIVITY').length || 0;

        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor(COLORS.heading)
          .text('Report Entries', left, doc.y, { width: pageWidth });

        doc.moveDown(0.2);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.body)
          .text(
            `${lessonsCount} lessons, ${activitiesCount} activities (${report.entries?.length || 0} total entries)`,
            left
          );
        doc.moveDown(0.8);

        const PAGE_BOTTOM = doc.page.height - doc.page.margins.bottom;

        const ensureSpace = (needed: number) => {
          if (doc.y + needed > PAGE_BOTTOM) {
            doc.addPage();
            doc.y = doc.page.margins.top;
          }
        };

        if (Array.isArray(report.entries) && report.entries.length > 0) {
          report.entries.forEach((entry: any, index: number) => {
            const isActivity = entry.entryType === 'ACTIVITY';
            const entryTypeLabel = isActivity ? 'Activity' : 'Lesson';
            const completed = !!entry.isCompleted;
            const accentColor = isActivity ? '#9333EA' : (completed ? COLORS.success : COLORS.brand);

            let summary = '-';
            let homework = '-';
            let tlm = '-';
            let activityCategory = '-';
            let activityDescription = '-';
            let learningOutcome = '-';
            let evidenceFilesText = '-';

            if (isActivity) {
              activityCategory = entry.activityCategory || '-';
              activityDescription = entry.activityDescription || '-';
              learningOutcome = entry.learningOutcome || '-';
              homework = entry.description || '-';
              if (entry.evidenceFiles && Array.isArray(entry.evidenceFiles) && entry.evidenceFiles.length > 0) {
                evidenceFilesText = `${entry.evidenceFiles.length} file(s) attached`;
              }
            } else {
              const parsed = parseEntryDescription(entry.description || '');
              summary = parsed.description || '-';
              homework = parsed.homework || '-';
              tlm = parsed.tlm || '-';
            }

            // Layout metrics (Tighter & Column-based calculation)
            const padX = 12;
            const padY = 10;
            const gap = 12;
            const innerWidth = pageWidth - (padX * 2);

            doc.font('Helvetica').fontSize(9);
            
            let maxTextH = 0;
            let activityColWidth = 0;
            let lessonColWidth = 0;

            if (isActivity) {
              // 4 Columns layout for Activity
              const numCols = 4;
              activityColWidth = (innerWidth - (gap * (numCols - 1))) / numCols;
              const textOpts = { width: activityColWidth, lineGap: 2.5 };
              
              const catH = doc.heightOfString(activityCategory, textOpts);
              const descH = doc.heightOfString(activityDescription, textOpts);
              const outcomeH = doc.heightOfString(learningOutcome, textOpts);
              
              let hwText = homework;
              if (evidenceFilesText !== '-') hwText += `\nEvidence: ${evidenceFilesText}`;
              const hwH = doc.heightOfString(hwText, textOpts);
              
              maxTextH = Math.max(catH, descH, outcomeH, hwH);
            } else {
              // 3 Columns layout for Lesson
              const numCols = 3;
              lessonColWidth = (innerWidth - (gap * (numCols - 1))) / numCols;
              const textOpts = { width: lessonColWidth, lineGap: 2.5 };
              
              const sumH = doc.heightOfString(summary, textOpts);
              const hwH = doc.heightOfString(homework, textOpts);
              const tlmH = doc.heightOfString(tlm, textOpts);
              
              maxTextH = Math.max(sumH, hwH, tlmH);
            }

            const headerH = 30;
            const estCardHeight = headerH + 18 + maxTextH + padY;

            ensureSpace(estCardHeight + 12);

            const startY = doc.y;

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
            doc.rect(left, startY, 4, headerH).fill(accentColor);
            doc.circle(left + 4, startY + 4, 4).fill(accentColor);
            doc.rect(left, startY, 4, 4).fill(accentColor);

            // Title & Status Badge
            const cy = startY + 10;
            const titleText = `${entryTypeLabel} ${index + 1}:  ${entry.class?.name || 'N/A'}  —  ${entry.subject?.name || 'N/A'}`;

            doc
              .font('Helvetica-Bold')
              .fontSize(10.5)
              .fillColor(COLORS.heading)
              .text(titleText, left + padX, cy);

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

            // Content
            const contentY = startY + headerH + 8;
            const textY = contentY + 12;

            if (isActivity) {
              // Activity mode layout (4 columns)
              const col1X = left + padX;
              const col2X = col1X + activityColWidth + gap;
              const col3X = col2X + activityColWidth + gap;
              const col4X = col3X + activityColWidth + gap;

              doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted);
              doc.text('CATEGORY', col1X, contentY, { width: activityColWidth, characterSpacing: 0.5 });
              doc.text('DESCRIPTION', col2X, contentY, { width: activityColWidth, characterSpacing: 0.5 });
              doc.text('OUTCOME', col3X, contentY, { width: activityColWidth, characterSpacing: 0.5 });
              doc.text('HOMEWORK / EVIDENCE', col4X, contentY, { width: activityColWidth, characterSpacing: 0.5 });

              doc.font('Helvetica').fontSize(9).fillColor(COLORS.body);
              doc.text(activityCategory, col1X, textY, { width: activityColWidth, lineGap: 2.5 });
              doc.text(activityDescription, col2X, textY, { width: activityColWidth, lineGap: 2.5 });
              doc.text(learningOutcome, col3X, textY, { width: activityColWidth, lineGap: 2.5 });
              
              let hwText = homework;
              if (evidenceFilesText !== '-') hwText += `\n[Evidence: ${evidenceFilesText}]`;
              doc.text(hwText, col4X, textY, { width: activityColWidth, lineGap: 2.5 });

            } else {
              // Lesson mode layout (3 columns)
              const col1X = left + padX;
              const col2X = col1X + lessonColWidth + gap;
              const col3X = col2X + lessonColWidth + gap;

              doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted);
              doc.text('SUMMARY', col1X, contentY, { width: lessonColWidth, characterSpacing: 0.5 });
              doc.text('HOMEWORK', col2X, contentY, { width: lessonColWidth, characterSpacing: 0.5 });
              doc.text('TLM / RESOURCES', col3X, contentY, { width: lessonColWidth, characterSpacing: 0.5 });

              doc.font('Helvetica').fontSize(9).fillColor(COLORS.body);
              doc.text(summary, col1X, textY, { width: lessonColWidth, lineGap: 2.5 });
              doc.text(homework, col2X, textY, { width: lessonColWidth, lineGap: 2.5 });
              doc.text(tlm, col3X, textY, { width: lessonColWidth, lineGap: 2.5 });
            }

            doc.y = startY + estCardHeight + 12;
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
          const footerY = doc.page.height - doc.page.margins.bottom + 12;
          
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