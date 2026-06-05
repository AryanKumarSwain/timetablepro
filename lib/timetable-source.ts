import { prisma } from '@/lib/prisma';

export type SlotRecord = {
  id: string;
  dayOfWeek: number;
  periodId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  timetableId?: string;
};

export async function getPublishedTimetable(schoolId: string) {
  return prisma.timetable.findFirst({
    where: { schoolId, status: 'PUBLISHED' },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getScheduleSlots(
  schoolId: string,
  filters?: {
    dayOfWeek?: number;
    classId?: string;
    teacherId?: string;
    timetableId?: string;
  }
): Promise<{ source: 'timetable' | 'weekly'; slots: SlotRecord[] }> {
  if (filters?.timetableId) {
    const slots = await prisma.timetableSlot.findMany({
      where: {
        schoolId,
        timetableId: filters.timetableId,
        ...(filters.dayOfWeek != null ? { dayOfWeek: filters.dayOfWeek } : {}),
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
      },
    });
    return {
      source: 'timetable',
      slots: slots.map((s) => ({ ...s, timetableId: s.timetableId })),
    };
  }

  const published = await getPublishedTimetable(schoolId);

  if (published) {
    const slots = await prisma.timetableSlot.findMany({
      where: {
        schoolId,
        timetableId: published.id,
        ...(filters?.dayOfWeek != null ? { dayOfWeek: filters.dayOfWeek } : {}),
        ...(filters?.classId ? { classId: filters.classId } : {}),
        ...(filters?.teacherId ? { teacherId: filters.teacherId } : {}),
      },
    });
    return {
      source: 'timetable',
      slots: slots.map((s) => ({ ...s, timetableId: published.id })),
    };
  }

  const weekly = await prisma.weeklyTimetableSlot.findMany({
    where: {
      schoolId,
      ...(filters?.dayOfWeek != null ? { dayOfWeek: filters.dayOfWeek } : {}),
      ...(filters?.classId ? { classId: filters.classId } : {}),
      ...(filters?.teacherId ? { teacherId: filters.teacherId } : {}),
    },
  });

  return {
    source: 'weekly',
    slots: weekly.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      periodId: s.periodId,
      classId: s.classId,
      subjectId: s.subjectId,
      teacherId: s.teacherId,
    })),
  };
}

// Fixed ISO/local safe mapping vector helper
export function getDayOfWeekFromDate(dateStr: string): number {
  // Split date components cleanly to avoid timezone offsets moving days back
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Align Sunday to index position 7 if your system shifts it to the end
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

export const SUBJECT_COLOR_PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];

export function subjectColor(subjectId: string, subjectIds: string[]): string {
  const index = subjectIds.indexOf(subjectId);
  return SUBJECT_COLOR_PALETTE[
    (index >= 0 ? index : subjectId.charCodeAt(0)) % SUBJECT_COLOR_PALETTE.length
  ];
}