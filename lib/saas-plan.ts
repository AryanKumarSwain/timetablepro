import { prisma } from './prisma';

export type DefaultSaaSPlan = {
  id: string;
  name: string;
  teacherMin: number;
  teacherMax: number;
  priceMonthly: number;
  reportEnabled?: boolean;
  attendanceEnabled?: boolean;
  homeworkEnabled?: boolean;
  lessonPlanningEnabled?: boolean;
};

export const defaultSaaSPlans: DefaultSaaSPlan[] = [
  {
    id: 'plan-free',
    name: 'Free',
    teacherMin: 0,
    teacherMax: 5,
    priceMonthly: 0,
    reportEnabled: false,
    attendanceEnabled: false,
    homeworkEnabled: false,
    lessonPlanningEnabled: false,
  },
  {
    id: 'plan-standard',
    name: 'Standard',
    teacherMin: 0,
    teacherMax: 15,
    priceMonthly: 199,
    reportEnabled: true,
    attendanceEnabled: false,
    homeworkEnabled: false,
    lessonPlanningEnabled: true,
  },
  {
    id: 'plan-premium',
    name: 'Premium',
    teacherMin: 16,
    teacherMax: 30,
    priceMonthly: 299,
    reportEnabled: true,
    attendanceEnabled: true,
    homeworkEnabled: false,
    lessonPlanningEnabled: true,
  },
  {
    id: 'plan-elite',
    name: 'Elite',
    teacherMin: 31,
    teacherMax: 100,
    priceMonthly: 399,
    reportEnabled: true,
    attendanceEnabled: true,
    homeworkEnabled: true,
    lessonPlanningEnabled: true,
  },
];

export async function ensureDefaultPlans() {
  await Promise.all(
    defaultSaaSPlans.map((plan) =>
      prisma.saaSPlan.upsert({
        where: { id: plan.id },
        update: {
          name: plan.name,
          teacherMin: plan.teacherMin,
          teacherMax: plan.teacherMax,
          priceMonthly: plan.priceMonthly,
          reportEnabled: plan.reportEnabled ?? false,
          attendanceEnabled: plan.attendanceEnabled ?? false,
          homeworkEnabled: plan.homeworkEnabled ?? false,
          lessonPlanningEnabled: plan.lessonPlanningEnabled ?? false,
        },
        create: {
          id: plan.id,
          name: plan.name,
          teacherMin: plan.teacherMin,
          teacherMax: plan.teacherMax,
          priceMonthly: plan.priceMonthly,
          reportEnabled: plan.reportEnabled ?? false,
          attendanceEnabled: plan.attendanceEnabled ?? false,
          homeworkEnabled: plan.homeworkEnabled ?? false,
          lessonPlanningEnabled: plan.lessonPlanningEnabled ?? false,
        },
      })
    )
  );
}
