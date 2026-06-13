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

  let teacherMax = 15; // Default baseline limit for schools without a plan

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
    return 15; // Default baseline limit
  }

  if (!school.planId) {
    return 15; // Default baseline limit for schools without a plan
  }

  const plan = await prisma.saaSPlan.findUnique({
    where: { id: school.planId },
    select: { teacherMax: true },
  });

  return plan?.teacherMax ?? 15;
}
