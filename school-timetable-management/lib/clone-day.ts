import { prisma } from '@/lib/prisma';

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export interface CloneDayResult {
  sourceDate: string;
  targetDate: string;
  attendanceCloned: number;
  replacementsCloned: number;
}

/**
 * Duplicates today's teacher attendance and replacement rows into the next calendar day.
 */
export async function cloneOperationalDay(
  schoolId: string,
  sourceDate: string
): Promise<CloneDayResult> {
  const targetDate = addDaysIso(sourceDate, 1);

  const [attendance, replacements] = await Promise.all([
    prisma.teacherAttendance.findMany({ where: { schoolId, date: sourceDate } }),
    prisma.replacementAssignment.findMany({ where: { schoolId, date: sourceDate } }),
  ]);

  let attendanceCloned = 0;
  for (const row of attendance) {
    await prisma.teacherAttendance.upsert({
      where: {
        teacherId_date: { teacherId: row.teacherId, date: targetDate },
      },
      create: {
        id: `attendance-${crypto.randomUUID()}`,
        schoolId,
        teacherId: row.teacherId,
        date: targetDate,
        status: row.status,
      },
      update: { status: row.status },
    });
    attendanceCloned += 1;
  }

  let replacementsCloned = 0;
  for (const row of replacements) {
    const exists = await prisma.replacementAssignment.findFirst({
      where: {
        schoolId,
        date: targetDate,
        periodId: row.periodId,
        classId: row.classId,
        originalTeacherId: row.originalTeacherId,
      },
    });
    if (exists) continue;

    await prisma.replacementAssignment.create({
      data: {
        id: `replacement-${crypto.randomUUID()}`,
        schoolId,
        date: targetDate,
        periodId: row.periodId,
        classId: row.classId,
        originalTeacherId: row.originalTeacherId,
        replacementTeacherId: row.replacementTeacherId,
        reason: row.reason,
        status: 'PENDING',
      },
    });
    replacementsCloned += 1;
  }

  return { sourceDate, targetDate, attendanceCloned, replacementsCloned };
}
