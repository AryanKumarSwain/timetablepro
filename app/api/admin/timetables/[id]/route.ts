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
            room: true,
          },
        },
      },
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const targetClassName = timetable.slots[0]?.class?.name || "General Schedule";

    const [timetablePeriods, classes, rooms, subjects, teachers] = await Promise.all([
      prisma.period.findMany({
        where: { schoolId, timetableId: id },
        orderBy: { startTime: 'asc' },
      }),
      prisma.classRoom.findMany({
        where: schoolWhere(schoolId),
        orderBy: { name: 'asc' },
      }),
      prisma.room.findMany({
        where: schoolWhere(schoolId),
        orderBy: { roomNumber: 'asc' },
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
      rooms: rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        name: r.roomNumber,
        floor: r.floor || undefined,
        block: r.block || undefined,
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
        roomId: s.roomId || undefined,
        roomNumber: s.room?.roomNumber || undefined,
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

    const { baseStartTime, periodDuration, workingDays, periods, slots, name, status } = body;
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
      // 1. If publishing this timeline tracking matrix, demote other layouts
      if (status === 'PUBLISHED') {
        await tx.timetable.updateMany({
          where: { schoolId, status: 'PUBLISHED', id: { not: id } },
          data: { status: 'DRAFT' },
        });
      }

      // 2. Commit parent configuration tracking fields
      await tx.timetable.update({
        where: { id },
        data: updateData,
      });

      // 3. Process structural rows and period intervals
      if (Array.isArray(periods)) {
        const incomingIds = periods
          .map((p: any) => p.id)
          .filter((pid: string) => pid && !pid.startsWith('row-'));

        // Cascade wipe slots matching dropped period profiles
        await tx.timetableSlot.deleteMany({
          where: {
            timetableId: id,
            periodId: { notIn: incomingIds }
          }
        });

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

      // --- CRITICAL DATA BRIDGE SYNC ADDITION ---
      // 4. Update and synchronize timetable slot configurations directly
      if (Array.isArray(slots)) {
        // Clear out the stale assignments index map for this specific timetable model
        await tx.timetableSlot.deleteMany({
          where: { timetableId: id }
        });

        // Batch insert the newly assigned array maps coming from the frontend matrix form
        if (slots.length > 0) {
          const slotData = slots.map((s: any) => {
            // Normalize dayOfWeek from frontend (0-6) to system format (1-7)
            const rawDay = Number(s.dayOfWeek);
            const normalizedDay = rawDay === 0 ? 7 : rawDay;
            return {
              dayOfWeek: normalizedDay,
              periodId: s.periodId,
              classId: s.classId,
              subjectId: s.subjectId,
              teacherId: s.teacherId,
              timetableId: id,
              schoolId: schoolId,
            };
          });
          console.log('[PATCH timetables] Creating slots:', {
            count: slotData.length,
            sample: slotData[0],
            schoolId,
            timetableId: id,
          });
          await tx.timetableSlot.createMany({
            data: slotData
          });
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

    // Delete associated slots and periods
    await prisma.timetableSlot.deleteMany({
      where: { timetableId: id }
    });
    
    await prisma.period.deleteMany({
      where: { timetableId: id }
    });

    await prisma.timetable.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}