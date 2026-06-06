import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1-week';
    const classId = searchParams.get('classId') || 'all';
    const schoolId = searchParams.get('schoolId');

    let targetedSchoolId = schoolId;
    if (!targetedSchoolId || targetedSchoolId === 'default-id' || targetedSchoolId === 'school-demo') {
      const fallbackSchool = await (prisma as any).school.findFirst({ select: { id: true } });
      if (!fallbackSchool) {
        return NextResponse.json({ teacherWorkload: [], subjectDistribution: [], totalSlots: 0, classesList: [] });
      }
      targetedSchoolId = fallbackSchool.id;
    }

    // Fetch Active Schedule Slots
    let activeSlots: any[] = [];
    try {
      const rawSlots = await (prisma as any).timetableslot.findMany({
        where: { schoolId: targetedSchoolId },
        include: { timetable: true }
      });
      activeSlots = rawSlots.filter((slot: any) => slot.timetable?.status === 'PUBLISHED');
    } catch (e) {
      try {
        const rawSlots = await (prisma as any).timetableSlot.findMany({
          where: { schoolId: targetedSchoolId },
          include: { timetable: true }
        });
        activeSlots = rawSlots.filter((slot: any) => slot.timetable?.status === 'PUBLISHED');
      } catch (err) {
        activeSlots = await prisma.weeklyTimetableSlot.findMany({
          where: { schoolId: targetedSchoolId }
        }).catch(() => []);
      }
    }

    // Fetch Metadata Records
    const [teachersList, subjectsList, classesList] = await Promise.all([
      (prisma as any).teacher.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true } }).catch(() => []),
      (prisma as any).subject.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true } }).catch(() => []),
      prisma.classRoom.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true, grade: true, section: true } }).catch(() => [])
    ]);

    let multiplier = 1;
    if (range === '2-weeks') multiplier = 2;
    if (range === '6-weeks') multiplier = 6;
    if (range === '1-year') multiplier = 52;

    const workloadMap: Record<string, number> = {};
    teachersList.forEach((t: any) => { workloadMap[t.id] = 0; });

    activeSlots.forEach((slot: any) => {
      if (workloadMap[slot.teacherId] !== undefined) {
        workloadMap[slot.teacherId] += 1 * multiplier;
      }
    });

    try {
      const modifications = await prisma.replacementAssignment.findMany({
        where: { schoolId: targetedSchoolId, status: 'CONFIRMED' }
      });

      modifications.forEach((mod: any) => {
        if (workloadMap[mod.originalTeacherId] !== undefined) {
          workloadMap[mod.originalTeacherId] = Math.max(0, workloadMap[mod.originalTeacherId] - 1);
        }
        if (workloadMap[mod.replacementTeacherId] !== undefined) {
          workloadMap[mod.replacementTeacherId] += 1;
        }
      });
    } catch (e) {
      console.warn("Could not calculate active substitution adjustments", e);
    }

    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f97316', '#06b6d4'];

    // CRITICAL CHANGE: We no longer .filter() out teachers with 0 classes!
    const teacherWorkload = teachersList.map((t: any, index: number) => ({
      name: t.name,
      classes: workloadMap[t.id] || 0,
      color: colors[index % colors.length]
    }));

    const filteredSlots = classId === 'all'
      ? activeSlots
      : activeSlots.filter((slot: any) => slot.classId === classId);

    const subjectCounts: Record<string, number> = {};
    filteredSlots.forEach((slot: any) => {
      subjectCounts[slot.subjectId] = (subjectCounts[slot.subjectId] || 0) + 1;
    });

    const totalSlotsCount = filteredSlots.length;

    const subjectDistribution = subjectsList.map((s: any, index: number) => {
      const count = subjectCounts[s.id] || 0;
      const percentage = totalSlotsCount > 0 ? Math.round((count / totalSlotsCount) * 100) : 0;
      return {
        name: s.name,
        value: percentage,
        color: colors[index % colors.length]
      };
    })
    .filter((s: any) => s.value > 0)
    .sort((a: any, b: any) => b.value - a.value);

    return NextResponse.json({
      teacherWorkload,
      subjectDistribution,
      totalSlots: totalSlotsCount,
      classesList: classesList.map((c: any) => ({
        id: c.id,
        label: c.grade && c.section ? `${c.grade}-${c.section} (${c.name})` : c.name
      }))
    });

  } catch (error) {
    console.error('Critical Dashboard Aggregation Fail:', error);
    return NextResponse.json({ teacherWorkload: [], subjectDistribution: [], totalSlots: 0, classesList: [] }, { status: 500 });
  }
}