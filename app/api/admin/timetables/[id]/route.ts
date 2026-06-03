import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import type { TimetableStatus } from '@prisma/client';
import { subjectColor } from '@/lib/timetable-source';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const { id } = await context.params;

    // Fetch the timetable along with its relational slot data mappings
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

    // FIXED: Order rows chronologically by startTime so BREAK segments do not jump to the top
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

    // FIXED: Order fallback default school-wide presets chronologically by startTime as well
    let fallbackPeriods = timetablePeriods;
    if (fallbackPeriods.length === 0) {
      fallbackPeriods = await prisma.period.findMany({
        where: { schoolId, timetableId: null },
        orderBy: { startTime: 'asc' },
      });
    }

    const subjectIds = subjects.map((s) => s.id);

    // Safely structure working days configuration array structures
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
      status: timetable.status,
      createdAt: timetable.createdAt.toISOString(),
      updatedAt: timetable.updatedAt.toISOString(),
      baseStartTime: timetable.baseStartTime,
      periodDuration: timetable.periodDuration,
      workingDays: parsedWorkingDays,
      periods: fallbackPeriods.map((p) => ({
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

    const data: any = {};
    
    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
    }
    
    if (body.status === 'DRAFT' || body.status === 'PUBLISHED') {
      if (body.status === 'PUBLISHED') {
        await prisma.timetable.updateMany({
          where: { schoolId, status: 'PUBLISHED', id: { not: id } },
          data: { status: 'DRAFT' },
        });
      }
      data.status = body.status;
    }

    if (typeof body.baseStartTime === 'string') {
      data.baseStartTime = body.baseStartTime;
    }
    if (typeof body.periodDuration === 'number') {
      data.periodDuration = body.periodDuration;
    }
    if (Array.isArray(body.workingDays)) {
      data.workingDays = body.workingDays; 
    }

    // Refresh structural rows without mutating globally accessible school presets
    if (Array.isArray(body.periods)) {
      await prisma.period.deleteMany({
        where: { timetableId: id, schoolId },
      });

      await prisma.period.createMany({
        data: body.periods.map((p: any) => ({
          schoolId,
          timetableId: id,
          periodNumber: Number(p.periodNumber) || 0,
          startTime: p.startTime,
          endTime: p.endTime,
          isBreak: !!p.isBreak,
          label: p.isBreak ? (p.breakLabel || p.label || 'LUNCH BREAK') : `Period ${p.periodNumber}`,
        })),
      });
    }

    const updated = await prisma.timetable.update({
      where: { id },
      data,
      include: { _count: { select: { slots: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      status: updated.status,
      slotCount: updated._count.slots,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      baseStartTime: updated.baseStartTime,
      periodDuration: updated.periodDuration,
      workingDays: body.workingDays || updated.workingDays,
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