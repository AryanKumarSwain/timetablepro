import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
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

export async function GET(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const reportDate = parseReportDateParam(dateParam);
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

      // Enrich with period info for UI
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
    const periods = await prisma.period.findMany({
      where: schoolWhere(schoolId),
    });
    const periodMap = new Map(periods.map((p) => [p.id, p]));

    return NextResponse.json({
      ...mapReportResponse(report),
      scheduleSlots: slots.map((slot) => {
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
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId, user } = await requireSchoolContext();
    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teacher = await resolveTeacher(schoolId, user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const body = await request.json();
    const reportDate = parseReportDateParam(
      body.date ? String(body.date) : 'today'
    );

    const report = await prisma.dailyReport.create({
      data: {
        teacherId: teacher.id,
        schoolId,
        reportDate,
      },
      include: reportInclude,
    });

    return NextResponse.json(mapReportResponse(report));
  } catch (error) {
    return handleApiError(error);
  }
}
