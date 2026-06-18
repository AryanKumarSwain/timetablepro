import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContextOptional,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import {
  parseReportDateParam,
  mapReportResponse,
  formatReportDate,
} from '@/lib/report-utils';
import { getScheduleSlots, getDayOfWeekFromDate } from '@/lib/timetable-source';

const reportInclude = {
  teacher: true,
  entries: { include: { class: true, subject: true } },
} as const;

async function resolveTeacher(schoolId: string, userEmail: string) {
  return prisma.teacher.findFirst({
    where: { schoolId, email: userEmail },
  });
}

// Helper to reliably establish absolute local dates without server timezone slip downs
function getAbsoluteLocalDate() {
  const d = new Date();
  // Adjusts manual runtime shifts to match local calendar configuration exactly
  const targetDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return new Date(targetDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

export async function GET(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContextOptional();
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If teacher has no school assignment, return empty data
    if (!schoolId) {
      const history = request.nextUrl.searchParams.get('history') === 'true';
      if (history) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ scheduleSlots: [] });
    }

    const teacher = await resolveTeacher(schoolId, user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const history = request.nextUrl.searchParams.get('history') === 'true';
    if (history) {
      const reports = await prisma.dailyReport.findMany({
        where: { teacherId: teacher.id, ...schoolWhere(schoolId) },
        include: reportInclude,
        orderBy: { reportDate: 'desc' },
      });
      return NextResponse.json(
        reports.map((r) => ({
          ...mapReportResponse(r),
          entryCount: r.entries.length,
        }))
      );
    }

    const dateParam = request.nextUrl.searchParams.get('date');
    // If getting today's workspace, assert absolute date lock
    const reportDate = !dateParam || dateParam === 'today' ? getAbsoluteLocalDate() : parseReportDateParam(dateParam);
    const dateStr = formatReportDate(reportDate);

    let report = await prisma.dailyReport.findUnique({
      where: {
        teacherId_reportDate: { teacherId: teacher.id, reportDate },
      },
      include: reportInclude,
    });

    if (!report) {
      const dayOfWeek = getDayOfWeekFromDate(dateStr);
      const { slots } = await getScheduleSlots(schoolId, {
        dayOfWeek,
        teacherId: teacher.id,
      });

      const [classes, subjects, periods] = await Promise.all([
        prisma.classRoom.findMany({ where: schoolWhere(schoolId) }),
        prisma.subject.findMany({ where: schoolWhere(schoolId) }),
        prisma.period.findMany({ where: schoolWhere(schoolId) }),
      ]);

      report = await prisma.dailyReport.create({
        data: {
          teacherId: teacher.id,
          schoolId,
          reportDate,
          entries: {
            create: slots.map((slot) => ({
              classId: slot.classId,
              subjectId: slot.subjectId,
              description: '',
              isCompleted: false,
            })),
          },
        },
        include: reportInclude,
      });

      const periodMap = new Map(periods.map((p) => [p.id, p]));
      return NextResponse.json({
        ...mapReportResponse(report),
        scheduleSlots: slots.map((slot) => {
          const period = periodMap.get(slot.periodId);
          const cls = classes.find((c) => c.id === slot.classId);
          const subject = subjects.find((s) => s.id === slot.subjectId);
          return {
            periodId: slot.periodId,
            periodNumber: period?.periodNumber ?? 0,
            startTime: period?.startTime ?? '',
            endTime: period?.endTime ?? '',
            classId: slot.classId,
            className: cls?.name ?? '',
            subjectId: slot.subjectId,
            subjectName: subject?.name ?? '',
          };
        }),
      });
    }

    const dayOfWeek = getDayOfWeekFromDate(dateStr);
    const { slots } = await getScheduleSlots(schoolId, {
      dayOfWeek,
      teacherId: teacher.id,
    });

    const missingSlots = slots.filter(
      (slot) =>
        !report!.entries.some(
          (e) => e.classId === slot.classId && e.subjectId === slot.subjectId
        )
    );

    if (missingSlots.length > 0) {
      await prisma.reportEntry.createMany({
        data: missingSlots.map((slot) => ({
          reportId: report!.id,
          classId: slot.classId,
          subjectId: slot.subjectId,
          description: '',
          isCompleted: false,
        })),
      });

      report = await prisma.dailyReport.findUnique({
        where: {
          teacherId_reportDate: { teacherId: teacher.id, reportDate },
        },
        include: reportInclude,
      });

      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
    }

    const periods = await prisma.period.findMany({
      where: schoolWhere(schoolId),
    });
    const periodMap = new Map(periods.map((p) => [p.id, p]));

    return NextResponse.json({
      ...mapReportResponse(report),
      scheduleSlots: slots
        .map((slot) => {
          const period = periodMap.get(slot.periodId);
          const entry = report!.entries.find(
            (e) => e.classId === slot.classId && e.subjectId === slot.subjectId
          );
          return {
            periodId: slot.periodId,
            periodNumber: period?.periodNumber ?? 0,
            startTime: period?.startTime ?? '',
            endTime: period?.endTime ?? '',
            classId: slot.classId,
            className: entry?.class.name ?? '',
            subjectId: slot.subjectId,
            subjectName: entry?.subject.name ?? '',
            entryId: entry?.id,
          };
        })
        .sort((a, b) => a.periodNumber - b.periodNumber),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContextOptional();
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If teacher has no school assignment, return error
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assignment' }, { status: 400 });
    }

    const teacher = await resolveTeacher(schoolId, user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const body = await request.json();

    // 🔥 THE FIX: Stop string date shifting on the backend
    let reportDate: Date;
    if (!body.date || body.date === 'today') {
      reportDate = getAbsoluteLocalDate();
    } else {
      // Handles parsing of custom incoming date fields cleanly
      const rawStr = String(body.date).split('T')[0];
      reportDate = new Date(rawStr + 'T00:00:00.000Z');
    }

    const entriesData = Array.isArray(body.entries)
      ? body.entries.map((e: any) => ({
          classId: e.classId,
          subjectId: e.subjectId,
          description: e.description || '',
          isCompleted: e.isCompleted ?? false,
        }))
      : [];

    const statusUpdate = body.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';

    // Check if the report record exists for this specific localized date instance
    let report = await prisma.dailyReport.findUnique({
      where: { teacherId_reportDate: { teacherId: teacher.id, reportDate } },
    });

    if (!report) {
      report = await prisma.dailyReport.create({
        data: {
          teacherId: teacher.id,
          schoolId,
          reportDate,
          status: statusUpdate,
          submittedAt: statusUpdate === 'SUBMITTED' ? new Date() : null,
          ...(entriesData.length > 0
            ? {
                entries: {
                  create: entriesData,
                },
              }
            : {}),
        },
        include: reportInclude,
      });
    } else {
      // Record already exists; perform safe row synchronization updates
      for (const entry of entriesData) {
        const existingEntry = await prisma.reportEntry.findFirst({
          where: { reportId: report.id, classId: entry.classId, subjectId: entry.subjectId }
        });

        if (existingEntry) {
          await prisma.reportEntry.update({
            where: { id: existingEntry.id },
            data: {
              description: entry.description,
              isCompleted: entry.isCompleted,
            },
          });
        } else {
          await prisma.reportEntry.create({
            data: {
              reportId: report.id,
              classId: entry.classId,
              subjectId: entry.subjectId,
              description: entry.description,
              isCompleted: entry.isCompleted,
            },
          });
        }
      }

      report = await prisma.dailyReport.update({
        where: { id: report.id },
        data: {
          status: statusUpdate,
          submittedAt: statusUpdate === 'SUBMITTED' ? new Date() : report.submittedAt,
        },
        include: reportInclude,
      });
    }

    return NextResponse.json(mapReportResponse(report));
  } catch (error) {
    return handleApiError(error);
  }
}
