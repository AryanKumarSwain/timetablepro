import { prisma } from './prisma';

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export async function checkTeacherLimit(schoolId: string): Promise<void> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      planId: true,
    },
  });

  if (!school) {
    throw new Error('School not found');
  }

  let teacherMax = 5; // Default baseline limit for schools without a plan (Free plan)

  if (school.planId) {
    const plan = await prisma.saaSPlan.findUnique({
      where: { id: school.planId },
      select: { teacherMax: true },
    });

    if (plan) {
      teacherMax = plan.teacherMax;
    }
  }

  const currentTeacherCount = await prisma.teacher.count({
    where: { schoolId },
  });

  if (currentTeacherCount >= teacherMax) {
    throw new PlanLimitError(
      `Teacher limit reached. Your current plan allows a maximum of ${teacherMax} teachers. Please upgrade your plan to add more teachers.`
    );
  }
}

export async function getTeacherLimit(schoolId: string): Promise<number> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      planId: true,
    },
  });

  if (!school) {
    return 5; // Default baseline limit (Free plan)
  }

  if (!school.planId) {
    return 5; // Default baseline limit for schools without a plan (Free plan)
  }

  const plan = await prisma.saaSPlan.findUnique({
    where: { id: school.planId },
    select: { teacherMax: true },
  });

  return plan?.teacherMax ?? 5;
}

export async function checkClassLimit(schoolId: string): Promise<void> {
  const currentClassCount = await prisma.classRoom.count({
    where: { schoolId },
  });

  if (currentClassCount >= 100) {
    throw new PlanLimitError(
      `Class limit reached. Your current plan allows a maximum of 100 classes. Please upgrade your plan to add more classes.`
    );
  }
}

export async function checkRoomLimit(schoolId: string): Promise<void> {
  const currentRoomCount = await prisma.room.count({
    where: { schoolId },
  });

  if (currentRoomCount >= 100) {
    throw new PlanLimitError(
      `Room limit reached. Your current plan allows a maximum of 100 rooms. Please upgrade your plan to add more rooms.`
    );
  }
}

export async function checkSubjectLimit(schoolId: string): Promise<void> {
  const currentSubjectCount = await prisma.subject.count({
    where: { schoolId },
  });

  if (currentSubjectCount >= 50) {
    throw new PlanLimitError(
      `Subject limit reached. Your current plan allows a maximum of 50 subjects. Please upgrade your plan to add more subjects.`
    );
  }
}

export async function checkTimetableLimit(schoolId: string): Promise<void> {
  const currentTimetableCount = await prisma.weeklyTimetableSlot.count({
    where: { schoolId },
  });

  if (currentTimetableCount >= 30) {
    throw new PlanLimitError(
      `Timetable limit reached. Your current plan allows a maximum of 30 timetable slots. Please upgrade your plan to add more slots.`
    );
  }
}
