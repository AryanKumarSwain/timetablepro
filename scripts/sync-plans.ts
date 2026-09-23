import 'dotenv/config';
import { prisma } from '../lib/prisma';

export const DEFAULT_PLANS = [
  {
    id: 'plan-free',
    name: 'Free',
    orderIndex: 0,
    teacherMin: 0,
    teacherMax: 5,
    priceMonthly: 0,
    reportEnabled: false,
    attendanceEnabled: false,
    homeworkEnabled: false,
    lessonPlanningEnabled: false,
    aiTimetableEnabled: false,
    exportFormats: ['pdf'],
    watermarkRequired: true,
  },
  {
    id: 'plan-standard',
    name: 'Standard',
    orderIndex: 1,
    teacherMin: 0,
    teacherMax: 15,
    priceMonthly: 199,
    reportEnabled: true,
    attendanceEnabled: false,
    homeworkEnabled: false,
    lessonPlanningEnabled: true,
    aiTimetableEnabled: false,
    exportFormats: ['pdf'],
    watermarkRequired: true,
  },
  {
    id: 'plan-premium',
    name: 'Premium',
    orderIndex: 2,
    teacherMin: 16,
    teacherMax: 30,
    priceMonthly: 299,
    reportEnabled: true,
    attendanceEnabled: true,
    homeworkEnabled: false,
    lessonPlanningEnabled: true,
    aiTimetableEnabled: true,
    exportFormats: ['pdf', 'docx'],
    watermarkRequired: true,
  },
  {
    id: 'plan-elite',
    name: 'Elite',
    orderIndex: 3,
    teacherMin: 31,
    teacherMax: 100,
    priceMonthly: 399,
    reportEnabled: true,
    attendanceEnabled: true,
    homeworkEnabled: true,
    lessonPlanningEnabled: true,
    aiTimetableEnabled: true,
    exportFormats: ['pdf', 'docx', 'csv'],
    watermarkRequired: false,
  },
  {
    id: 'plan-elite-ai',
    name: 'Elite AI',
    orderIndex: 4,
    teacherMin: 31,
    teacherMax: 100,
    priceMonthly: 499,
    reportEnabled: true,
    attendanceEnabled: true,
    homeworkEnabled: true,
    lessonPlanningEnabled: true,
    aiTimetableEnabled: true,
    exportFormats: ['pdf', 'docx', 'csv'],
    watermarkRequired: false,
  },
  {
    id: 'plan-custom',
    name: 'Custom',
    orderIndex: 5,
    teacherMin: 0,
    teacherMax: 9999,
    priceMonthly: 0,
    reportEnabled: true,
    attendanceEnabled: true,
    homeworkEnabled: true,
    lessonPlanningEnabled: true,
    aiTimetableEnabled: true,
    exportFormats: ['pdf', 'docx', 'csv'],
    watermarkRequired: false,
  },
];

async function syncPlans() {
  console.log('🔄 Syncing SaaS plans in database...');

  for (const plan of DEFAULT_PLANS) {
    try {
      const existing = await prisma.saaSPlan.findFirst({
        where: {
          OR: [{ id: plan.id }, { name: plan.name }],
        },
      });

      if (existing) {
        await prisma.saaSPlan.update({
          where: { id: existing.id },
          data: {
            name: plan.name,
            orderIndex: plan.orderIndex,
            teacherMin: plan.teacherMin,
            teacherMax: plan.teacherMax,
            priceMonthly: plan.priceMonthly,
            reportEnabled: plan.reportEnabled,
            attendanceEnabled: plan.attendanceEnabled,
            homeworkEnabled: plan.homeworkEnabled,
            lessonPlanningEnabled: plan.lessonPlanningEnabled,
            aiTimetableEnabled: plan.aiTimetableEnabled,
            exportFormats: plan.exportFormats,
            watermarkRequired: plan.watermarkRequired,
          },
        });
        console.log(`✅ Updated existing plan: ${plan.name} (${existing.id})`);
      } else {
        await prisma.saaSPlan.create({
          data: plan,
        });
        console.log(`✨ Created new plan: ${plan.name} (${plan.id})`);
      }
    } catch (err: any) {
      console.error(`❌ Failed to sync plan "${plan.name}":`, err.message);
    }
  }

  const allPlans = await prisma.saaSPlan.findMany({
    orderBy: { orderIndex: 'asc' },
    select: { id: true, name: true, priceMonthly: true, orderIndex: true, aiTimetableEnabled: true },
  });

  console.log('\n📋 Current plans in database:');
  console.table(allPlans);
  console.log('🎉 SaaS plans sync complete!');
}

syncPlans()
  .catch((e) => {
    console.error('Fatal error during syncPlans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
