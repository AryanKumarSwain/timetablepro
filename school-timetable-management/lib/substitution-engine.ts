import { prisma } from '@/lib/prisma';

export type SubstitutionPriority = 1 | 2 | 3;

export interface SubstituteCandidate {
  teacherId: string;
  name: string;
  email: string;
  priority: SubstitutionPriority;
  substitutionCountToday: number;
  warnings: string[];
}

export interface SubstitutionRequest {
  schoolId: string;
  date: string;
  periodId: string;
  classId: string;
  originalTeacherId: string;
  slotSubjectId: string;
}

/** Faculty branch = first 3 letters of subject code (e.g. PHY, MAT). */
function subjectDepartmentCode(code: string): string {
  return code.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
}

export async function findSubstituteCandidates(
  input: SubstitutionRequest
): Promise<SubstituteCandidate[]> {
  const { schoolId, date, periodId, classId, originalTeacherId, slotSubjectId } =
    input;

  const dateObj = new Date(`${date}T12:00:00`);
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();

  const [slotSubject, allTeachers, absentToday, busyThisPeriod, todayReplacements] =
    await Promise.all([
      prisma.subject.findFirst({
        where: { id: slotSubjectId, schoolId },
      }),
      prisma.teacher.findMany({
        where: { schoolId, id: { not: originalTeacherId } },
      }),
      prisma.teacherAttendance.findMany({
        where: { schoolId, date, status: 'ABSENT' },
        select: { teacherId: true },
      }),
      prisma.weeklyTimetableSlot.findMany({
        where: { schoolId, dayOfWeek, periodId },
        select: { teacherId: true },
      }),
      prisma.replacementAssignment.findMany({
        where: { schoolId, date },
        select: { replacementTeacherId: true, classId: true, periodId: true },
      }),
    ]);

  const absentIds = new Set(absentToday.map((a) => a.teacherId));
  const busyIds = new Set(busyThisPeriod.map((s) => s.teacherId));

  const slotDept = slotSubject
    ? subjectDepartmentCode(slotSubject.code)
    : '';

  const specialtyIds = new Set(allTeachers.map((t) => t.subjectSpecialtyId));
  const specialties = await prisma.subject.findMany({
    where: { schoolId, id: { in: [...specialtyIds] } },
  });
  const specialtyDeptByTeacher = new Map(
    allTeachers.map((t) => {
      const sub = specialties.find((s) => s.id === t.subjectSpecialtyId);
      return [t.id, sub ? subjectDepartmentCode(sub.code) : ''] as const;
    })
  );

  const replacementCountByTeacher = new Map<string, number>();
  const classPeriodCountByTeacher = new Map<string, number>();

  for (const r of todayReplacements) {
    replacementCountByTeacher.set(
      r.replacementTeacherId,
      (replacementCountByTeacher.get(r.replacementTeacherId) ?? 0) + 1
    );
    if (r.classId === classId) {
      const key = r.replacementTeacherId;
      classPeriodCountByTeacher.set(key, (classPeriodCountByTeacher.get(key) ?? 0) + 1);
    }
  }

  const available = allTeachers.filter(
    (t) => !absentIds.has(t.id) && !busyIds.has(t.id)
  );

  const withMeta = available.map((teacher) => {
    const warnings: string[] = [];
    const classDayCount = classPeriodCountByTeacher.get(teacher.id) ?? 0;
    if (classDayCount >= 2) {
      warnings.push(
        `Teacher already has ${classDayCount} substitution periods with this class section today (max recommended: 2).`
      );
    } else if (classDayCount === 1) {
      warnings.push(
        'Assigning this period would be the 2nd substitution with this class section today.'
      );
    }

    let priority: SubstitutionPriority = 3;
    if (teacher.subjectSpecialtyId === slotSubjectId) {
      priority = 1;
    } else if (
      slotDept &&
      specialtyDeptByTeacher.get(teacher.id) === slotDept
    ) {
      priority = 2;
    }

    return {
      teacherId: teacher.id,
      name: teacher.name,
      email: teacher.email,
      priority,
      substitutionCountToday: replacementCountByTeacher.get(teacher.id) ?? 0,
      warnings,
    };
  });

  return withMeta.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.substitutionCountToday !== b.substitutionCountToday) {
      return a.substitutionCountToday - b.substitutionCountToday;
    }
    return a.name.localeCompare(b.name);
  });
}
