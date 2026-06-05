import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { subjectColor } from '@/lib/timetable-source';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    const timetable = await prisma.timetable.findFirst({
      where: { id, ...schoolWhere(schoolId) },
      include: {
        slots: {
          include: {
            period: true,
            class: true,
            subject: true,
            teacher: true,
          },
        },
      },
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const targetClassName = timetable.slots[0]?.class?.name || "General Schedule";

    const [timetablePeriods, classes, subjects, teachers] = await Promise.all([
      prisma.period.findMany({
        where: { schoolId, timetableId: id },
        orderBy: { startTime: 'asc' },
      }),
      prisma.classRoom.findMany({
        where: schoolWhere(schoolId),
        orderBy: { name: 'asc' },
      }),
      prisma.subject.findMany({
        where: schoolWhere(schoolId),
        orderBy: { name: 'asc' },
      }),
      prisma.teacher.findMany({
        where: schoolWhere(schoolId),
        orderBy: { name: 'asc' },
      }),
    ]);

    const finalPeriods = timetablePeriods;
    const subjectIds = subjects.map((s) => s.id);

    let parsedWorkingDays = [1, 2, 3, 4, 5];
    if (timetable.workingDays) {
      try {
        parsedWorkingDays = typeof timetable.workingDays === 'string'
          ? JSON.parse(timetable.workingDays)
          : (timetable.workingDays as any);
      } catch (e) {
        console.error("Failed parsing working days:", e);
      }
    }

    return NextResponse.json({
      id: timetable.id,
      name: timetable.name,
      targetClassName,
      status: timetable.status,
      createdAt: timetable.createdAt.toISOString(),
      updatedAt: timetable.updatedAt.toISOString(),
      baseStartTime: timetable.baseStartTime,
      periodDuration: timetable.periodDuration,
      workingDays: parsedWorkingDays,
      periods: finalPeriods.map((p) => ({
        id: p.id,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
        label: p.isBreak ? (p.label || 'BREAK') : `Period ${p.periodNumber}`,
      })),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        section: c.section,
        roomNumber: c.roomNumber,
      })),
      subjects: subjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        color: subjectColor(s.id, subjectIds),
      })),
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        active: t.active,
      })),
      slots: timetable.slots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        periodId: s.periodId,
        classId: s.classId,
        subjectId: s.subjectId,
        teacherId: s.teacherId,
        periodNumber: s.period.periodNumber,
        className: s.class.name,
        subjectName: s.subject.name,
        teacherName: s.teacher.name,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.timetable.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { baseStartTime, periodDuration, workingDays, periods, name, status } = body;
    const updateData: any = {};

    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    if (status === 'DRAFT' || status === 'PUBLISHED') {
      updateData.status = status;
    }

    if (typeof baseStartTime === 'string') {
      updateData.baseStartTime = baseStartTime;
    }
    if (typeof periodDuration === 'number') {
      updateData.periodDuration = periodDuration;
    }
    if (Array.isArray(workingDays)) {
      updateData.workingDays = workingDays;
    }

    await prisma.$transaction(async (tx) => {
      if (status === 'PUBLISHED') {
        await tx.timetable.updateMany({
          where: { schoolId, status: 'PUBLISHED', id: { not: id } },
          data: { status: 'DRAFT' },
        });
      }

      await tx.timetable.update({
        where: { id },
        data: updateData,
      });

      if (Array.isArray(periods)) {
        // Fix: Explicitly track real generated database IDs
        const incomingIds = periods
          .map((p: any) => p.id)
          .filter((pid: string) => pid && !pid.startsWith('row-'));

        // 1. Cascade clear out all slots attached to missing rows first
        await tx.timetableSlot.deleteMany({
          where: {
            timetableId: id,
            periodId: { notIn: incomingIds }
          }
        });

        // 2. Safely perform clean structural updates
        await tx.period.deleteMany({
          where: { timetableId: id, schoolId, id: { notIn: incomingIds } },
        });

        for (const p of periods) {
          const formattedLabel = p.isBreak
            ? (p.breakLabel || p.label || 'LUNCH BREAK')
            : `Period ${p.periodNumber}`;

          const data = {
            schoolId,
            timetableId: id,
            periodNumber: Number(p.periodNumber) || 0,
            startTime: p.startTime,
            endTime: p.endTime,
            isBreak: !!p.isBreak,
            label: formattedLabel,
          };

          if (p.id && !p.id.startsWith('row-')) {
            await tx.period.update({
              where: { id: p.id },
              data,
            });
          } else {
            await tx.period.create({
              data: { ...data, id: undefined },
            });
          }
        }
      }
    });

    const updated = await prisma.timetable.findUnique({
      where: { id },
      include: {
        _count: { select: { slots: true } },
        periods: { orderBy: { startTime: 'asc' } }
      },
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed retrieving post update profile.' }, { status: 500 });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      status: updated.status,
      slotCount: updated._count.slots,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      baseStartTime: updated.baseStartTime,
      periodDuration: updated.periodDuration,
      workingDays: updated.workingDays,
      periods: updated.periods.map(p => ({
        id: p.id,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
        label: p.label
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    const existing = await prisma.timetable.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.timetable.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}