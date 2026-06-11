import { prisma } from './prisma';

export type DefaultSaaSPlan = {
  id: string;
  name: string;
  teacherMin: number;
  teacherMax: number;
  priceMonthly: number;
};

export const defaultSaaSPlans: DefaultSaaSPlan[] = [
  {
    id: 'plan-basic',
    name: 'Basic',
    teacherMin: 0,
    teacherMax: 50,
    priceMonthly: 29,
  },
  {
    id: 'plan-growth',
    name: 'Growth',
    teacherMin: 51,
    teacherMax: 200,
    priceMonthly: 79,
  },
  {
    id: 'plan-enterprise-pro',
    name: 'Enterprise Pro',
    teacherMin: 201,
    teacherMax: 9999,
    priceMonthly: 199,
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
        },
        create: {
          id: plan.id,
          name: plan.name,
          teacherMin: plan.teacherMin,
          teacherMax: plan.teacherMax,
          priceMonthly: plan.priceMonthly,
        },
      })
    )
  );
}
