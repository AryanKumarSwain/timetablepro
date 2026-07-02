import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1-week';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const classId = searchParams.get('classId') || 'all';
    const schoolId = searchParams.get('schoolId');

    let targetedSchoolId = schoolId;
    if (!targetedSchoolId || targetedSchoolId === 'default-id') {
      return NextResponse.json({ teacherWorkload: [], subjectDistribution: [], totalSlots: 0, classesList: [] });
    }

    // 1. DYNAMIC RANGE & MULTIPLIER CALCULATION
    let multiplier = 1;

    if (startDateStr && endDateStr) {
      // Calculate weeks between custom range to accurately scale recurring timetable slots
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      const diffInMs = Math.abs(end.getTime() - start.getTime());
      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)) || 1;
      
      // Convert days to weeks baseline (minimum 1 week multiplier allocation)
      multiplier = Math.max(1, Math.round(diffInDays / 7));
    } else {
      // Fallback to traditional quick-select strings
      if (range === '2-weeks') multiplier = 2;
      if (range === '6-weeks') multiplier = 6;
      if (range === '1-year') multiplier = 52;
    }

    // 2. FETCH ACTIVE SCHEDULE SLOTS
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

    // 3. FETCH METADATA RECORDS
    const [teachersList, subjectsList, classesList] = await Promise.all([
      (prisma as any).teacher.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true } }).catch(() => []),
      (prisma as any).subject.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true } }).catch(() => []),
      prisma.classRoom.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true, grade: true, section: true } }).catch(() => [])
    ]);

    const workloadMap: Record<string, number> = {};
    teachersList.forEach((t: any) => { workloadMap[t.id] = 0; });

    activeSlots.forEach((slot: any) => {
      if (workloadMap[slot.teacherId] !== undefined) {
        workloadMap[slot.teacherId] += 1 * multiplier;
      }
    });

    // 4. APPLY LIVE SUBSTITUTION ADJUSTMENTS
    try {
      // Build conditions for daily modifications adjustments
      const substitutionWhereClause: any = {
        schoolId: targetedSchoolId,
        status: 'CONFIRMED'
      };

      if (startDateStr && endDateStr) {
        substitutionWhereClause.date = {
          gte: startDateStr,
          lte: endDateStr
        };
      }

      const modifications = await prisma.replacementAssignment.findMany({
        where: substitutionWhereClause
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

    // Total slots processed scales linearly with structural system depth loops
    const totalSlotsCount = filteredSlots.length * multiplier;

    const subjectDistribution = subjectsList.map((s: any, index: number) => {
      const count = subjectCounts[s.id] || 0;
      const percentage = totalSlotsCount > 0 ? Math.round(((count * multiplier) / totalSlotsCount) * 100) : 0;
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