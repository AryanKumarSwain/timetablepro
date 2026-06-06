import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1-week';
    const classId = searchParams.get('classId') || 'all';
    const schoolId = searchParams.get('schoolId');

    // 1. Resolve a valid School ID
    let targetedSchoolId = schoolId;
    if (!targetedSchoolId || targetedSchoolId === 'default-id' || targetedSchoolId === 'school-demo') {
      // Fallback to raw client handle if extended school property isn't defined
      const fallbackSchool = await (prisma as any).school.findFirst({ select: { id: true } });
      if (!fallbackSchool) {
        return NextResponse.json({ teacherWorkload: [], subjectDistribution: [], totalSlots: 0, classesList: [] });
      }
      targetedSchoolId = fallbackSchool.id;
    }

    // 2. Fetch Active Schedule Slots
    // Using explicit table property names matching your exact Prisma runtime instance
    let activeSlots: any[] = [];
    try {
      // Check your mapped timetable model key
      const rawSlots = await (prisma as any).timetableslot.findMany({
        where: { schoolId: targetedSchoolId },
        include: { timetable: true }
      });
      activeSlots = rawSlots.filter((slot: any) => slot.timetable?.status === 'PUBLISHED');
    } catch (e) {
      console.warn("timetableslot not found, trying camelCase variant or fallback...");
      try {
        const rawSlots = await (prisma as any).timetableSlot.findMany({
          where: { schoolId: targetedSchoolId },
          include: { timetable: true }
        });
        activeSlots = rawSlots.filter((slot: any) => slot.timetable?.status === 'PUBLISHED');
      } catch (err) {
        // If timetable slots don't exist yet, fall back to your working weeklyTimetableSlot
        activeSlots = await prisma.weeklyTimetableSlot.findMany({
          where: { schoolId: targetedSchoolId }
        }).catch(() => []);
      }
    }

    // 3. Fetch Metadata Records safely using your file's working mapping
    const [teachersList, subjectsList, classesList] = await Promise.all([
      (prisma as any).teacher.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true } }).catch(() => []),
      (prisma as any).subject.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true } }).catch(() => []),
      prisma.classRoom.findMany({ where: { schoolId: targetedSchoolId }, select: { id: true, name: true, grade: true, section: true } }).catch(() => [])
    ]);

    // 4. Calculate Teacher Workloads with Substitution Overloads
    let multiplier = 1;
    if (range === '2-weeks') multiplier = 2;
    if (range === '6-weeks') multiplier = 6;
    if (range === '1-year') multiplier = 52;

    const workloadMap: Record<string, number> = {};
    teachersList.forEach((t: any) => { workloadMap[t.id] = 0; });

    // Base calculation from active slots
    activeSlots.forEach((slot: any) => {
      if (workloadMap[slot.teacherId] !== undefined) {
        workloadMap[slot.teacherId] += 1 * multiplier;
      }
    });

    // Daily Desk substitutions adjustment (Using your working replacementAssignment handle)
    try {
      const modifications = await prisma.replacementAssignment.findMany({
        where: { schoolId: targetedSchoolId, status: 'CONFIRMED' }
      });

      modifications.forEach((mod: any) => {
        // Subtract 1 baseline class from the absent teacher
        if (workloadMap[mod.originalTeacherId] !== undefined) {
          workloadMap[mod.originalTeacherId] = Math.max(0, workloadMap[mod.originalTeacherId] - 1);
        }
        // Add 1 replacement class load to the cover teacher
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
    }))
    .filter((t: any) => t.classes > 0)
    .sort((a: any, b: any) => b.classes - a.classes)
    .slice(0, 6);

    // 5. Calculate Dynamic Class Subject Distribution
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

    // 6. Return Structured API Result
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