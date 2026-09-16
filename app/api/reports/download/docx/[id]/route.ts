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
  Header,
  Footer,
} from 'docx';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere, requireExportAccess } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

type ReportEntryItem = {
  entryType?: string | null;
  class?: { name?: string | null } | null;
  subject?: { name?: string | null } | null;
  activityCategory?: string | null;
  activityDescription?: string | null;
  description?: string | null;
  learningOutcome?: string | null;
};

type DailyReportItem = {
  status?: string | null;
  teacher?: { name?: string | null; email?: string | null } | null;
  entries?: ReportEntryItem[];
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { watermarkRequired } = await requireExportAccess('docx');
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
        text: (school?.name || 'School').toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: 'DAILY TEACHING REPORTS ARCHIVE',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Report Date: ', bold: true }),
          new TextRun({ text: `${cleanId}    |    ` }),
          new TextRun({ text: 'Total Teachers: ', bold: true }),
          new TextRun({ text: `${reports.length}` }),
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
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Faculty / Status', bold: true, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Class & Subject', bold: true, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Entry Type', bold: true, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            width: { size: 4800, type: WidthType.DXA },
            shading: { fill: '2563EB' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Lessons / Activities Covered', bold: true, color: 'FFFFFF' })] })],
          }),
        ],
      }),
    ];

    reports.forEach((report: DailyReportItem, rIdx: number) => {
      const bg = rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      if (report.entries && report.entries.length > 0) {
        report.entries.forEach((entry: ReportEntryItem, eIdx: number) => {
          const isActivity = entry.entryType === 'ACTIVITY';
          const descText = isActivity
            ? `Activity: ${entry.activityDescription || entry.description || '-'}\nOutcome: ${entry.learningOutcome || '-'}`
            : (entry.description || '-');

          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: bg },
                  children: eIdx === 0 ? [
                    new Paragraph({ children: [new TextRun({ text: report.teacher?.name || 'Faculty', bold: true })] }),
                    new Paragraph({ text: report.status || 'DRAFT' }),
                  ] : [],
                }),
                new TableCell({
                  shading: { fill: bg },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: entry.class?.name || 'N/A', bold: true })] }),
                    new Paragraph({ text: entry.subject?.name || 'N/A' }),
                  ],
                }),
                new TableCell({
                  shading: { fill: bg },
                  children: [new Paragraph({ text: isActivity ? `Activity` : 'Lesson' })],
                }),
                new TableCell({
                  shading: { fill: bg },
                  children: descText.split('\n').map((line) => new Paragraph({ text: line })),
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
                shading: { fill: bg },
                children: [
                  new Paragraph({ children: [new TextRun({ text: report.teacher?.name || 'Faculty', bold: true })] }),
                  new Paragraph({ text: report.status || 'DRAFT' }),
                ],
              }),
              new TableCell({
                columnSpan: 3,
                shading: { fill: bg },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'No entries recorded for this date.', italics: true })],
                  }),
                ],
              }),
            ],
          })
        );
      }
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
              text: 'Document created via TimetablePro. Watermarked Plan Edition.',
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
    const filename = `all-reports-${cleanId}.docx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Date DOCX Generation Error]:', error);
    return handleApiError(error);
  }
}
