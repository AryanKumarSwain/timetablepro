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

    const [periods, classes, subjects, teachers] = await Promise.all([
      prisma.period.findMany({
        where: schoolWhere(schoolId),
        orderBy: { periodNumber: 'asc' },
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

    const subjectIds = subjects.map((s) => s.id);

    return NextResponse.json({
      id: timetable.id,
      name: timetable.name,
      status: timetable.status,
      createdAt: timetable.createdAt.toISOString(),
      updatedAt: timetable.updatedAt.toISOString(),
      periods: periods.map((p) => ({
        id: p.id,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
        label: `Period ${p.periodNumber}`,
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

    const data: { name?: string; status?: TimetableStatus } = {};
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
