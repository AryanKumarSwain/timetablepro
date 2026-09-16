import { NextResponse } from 'next/server';
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
  BorderStyle,
  Header,
  Footer,
} from 'docx';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere, requireExportAccess } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function parseDescription(raw = '') {
  const homeworkMarker = '\n\nHomework:';
  const tlmMarker = '\n\nTLM:';
  const homeworkIdx = raw.indexOf(homeworkMarker);
  const tlmIdx = raw.indexOf(tlmMarker);

  let description = raw.trim();
  let homework = '';
  let tlm = '';

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
  } else if (tlmIdx !== -1) {
    description = raw.slice(0, tlmIdx).trim();
    tlm = raw.slice(tlmIdx + tlmMarker.length).trim();
  }

  return { description, homework, tlm };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { watermarkRequired } = await requireExportAccess('docx');
    const { id } = await context.params;

    const report = await prisma.dailyReport.findFirst({
      where: {
        id,
        ...schoolWhere(schoolId),
      },
      include: {
        teacher: true,
        school: true,
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

    const teacherName = report.teacher?.name || 'Faculty';
    const schoolName = report.school?.name || 'School';
    const reportDateStr = report.reportDate
      ? new Date(report.reportDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A';

    const cleanDateStr = report.reportDate
      ? new Date(report.reportDate).toISOString().split('T')[0]
      : 'export';

    const documentChildren: any[] = [];

    // Header banner if watermarked
    if (watermarkRequired) {
      documentChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '⚠️ GENERATED VIA TIMETABLEPRO • WATERMARKED EDITION (UPGRADE PLAN TO REMOVE)',
              size: 18,
              bold: true,
              color: '718096',
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Title
    documentChildren.push(
      new Paragraph({
        text: schoolName.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: 'DAILY TEACHING REPORT',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Teacher: ', bold: true }),
          new TextRun({ text: `${teacherName}    |    ` }),
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun({ text: `${reportDateStr}    |    ` }),
          new TextRun({ text: 'Status: ', bold: true }),
          new TextRun({ text: report.status || 'DRAFT', color: report.status === 'SUBMITTED' ? '059669' : 'D97706' }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );

    // Table Header
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Class & Subject', bold: true, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Type / Category', bold: true, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            width: { size: 3800, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Description / Activity', bold: true, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'TLM / Homework', bold: true, color: 'FFFFFF' })] })],
          }),
        ],
      }),
    ];

    if (report.entries && report.entries.length > 0) {
      report.entries.forEach((entry, index) => {
        const isActivity = entry.entryType === 'ACTIVITY';
        const parsed = parseDescription(entry.description || '');

        let mainDesc = isActivity ? (entry.activityDescription || entry.description || '-') : (parsed.description || '-');
        let extraInfo = isActivity 
          ? `Outcome: ${entry.learningOutcome || '-'}` 
          : `TLM: ${parsed.tlm || '-'}\nHW: ${parsed.homework || '-'}`;

        const bgFill = index % 2 === 0 ? 'FFFFFF' : 'F8FAFC';

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: bgFill },
                children: [new Paragraph({ text: String(index + 1) })],
              }),
              new TableCell({
                shading: { fill: bgFill },
                children: [
                  new Paragraph({ children: [new TextRun({ text: entry.class?.name || 'N/A', bold: true })] }),
                  new Paragraph({ text: entry.subject?.name || 'N/A' }),
                ],
              }),
              new TableCell({
                shading: { fill: bgFill },
                children: [new Paragraph({ text: isActivity ? `Activity (${entry.activityCategory || 'Gen'})` : 'Lesson' })],
              }),
              new TableCell({
                shading: { fill: bgFill },
                children: [new Paragraph({ text: mainDesc })],
              }),
              new TableCell({
                shading: { fill: bgFill },
                children: extraInfo.split('\n').map((line) => new Paragraph({ text: line })),
              }),
            ],
          })
        );
      });
    } else {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 5,
              children: [new Paragraph({ text: 'No teaching entries logged for this report.', alignment: AlignmentType.CENTER })],
            }),
          ],
        })
      );
    }

    documentChildren.push(
      new Table({
        rows: tableRows,
        width: { size: 9600, type: WidthType.DXA },
      })
    );

    // Footer Watermark remark if watermarked
    if (watermarkRequired) {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Document created using TimetablePro. Watermarked plan edition.',
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
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          headers: watermarkRequired
            ? {
                default: new Header({
                  children: [
                    new Paragraph({
                      text: 'TIMETABLEPRO WATERMARK',
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({
                          text: 'TIMETABLEPRO WATERMARK',
                          color: 'CBD5E1',
                          size: 16,
                          bold: true,
                        }),
                      ],
                    }),
                  ],
                }),
              }
            : undefined,
          footers: watermarkRequired
            ? {
                default: new Footer({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: 'Generated via TimetablePro • Watermarked Edition',
                          color: '94A3B8',
                          size: 16,
                          italics: true,
                        }),
                      ],
                    }),
                  ],
                }),
              }
            : undefined,
          children: documentChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `report-${teacherName.replace(/\s+/g, '-')}-${cleanDateStr}.docx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[DOCX Generation Error]:', error);
    return handleApiError(error);
  }
}
