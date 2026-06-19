import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  // ── Plans ───────────────────────────────────────────────────────────────────
  // Clean up old plans to avoid conflicts
  await prisma.saaSPlan.deleteMany({});

  // Create new SaaS plans with feature flags
  const plans = [
    {
      id: 'plan-free',
      name: 'Free',
      teacherMin: 0,
      teacherMax: 5,
      priceMonthly: 0,
      reportEnabled: false,
      attendanceEnabled: false,
      homeworkEnabled: false,
      exportFormats: ['pdf'],
      watermarkRequired: true,
    },
    {
      id: 'plan-standard',
      name: 'Standard',
      teacherMin: 0,
      teacherMax: 20,
      priceMonthly: 199,
      reportEnabled: true,
      attendanceEnabled: false,
      homeworkEnabled: false,
      exportFormats: ['pdf'],
      watermarkRequired: true,
    },
    {
      id: 'plan-premium',
      name: 'Premium',
      teacherMin: 21,
      teacherMax: 50,
      priceMonthly: 299,
      reportEnabled: true,
      attendanceEnabled: true,
      homeworkEnabled: false,
      exportFormats: ['pdf', 'docx'],
      watermarkRequired: true,
    },
    {
      id: 'plan-elite',
      name: 'Elite',
      teacherMin: 51,
      teacherMax: 100,
      priceMonthly: 399,
      reportEnabled: true,
      attendanceEnabled: true,
      homeworkEnabled: true,
      exportFormats: ['pdf', 'docx', 'csv'],
      watermarkRequired: false,
    },
  ];

  await Promise.all(
    plans.map((plan) =>
      prisma.saaSPlan.create({
        data: plan,
      })
    )
  );

  const standardPlan = await prisma.saaSPlan.findUnique({ where: { id: 'plan-standard' } });
  if (!standardPlan) {
    throw new Error('Standard plan was not created during seed.');
  }

  // ── School ────────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 'school-demo' },
    update: {},
    create: {
      id: 'school-demo',
      name: 'Demo International School',
      licenseStatus: 'ACTIVE',
      planId: standardPlan.id,
    },
  });

  const schoolId = school.id;

  // ── Super Admin ───────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'super@platform.edu' },
    update: { 
      password: passwordHash, 
      role: 'SUPER_ADMIN', 
      schoolId: null 
    },
    create: {
      email: 'super@platform.edu',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      schoolId: null,
    },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('✅ Seed complete.');
  console.log('\n── Plans ────────────────────────────────');
  plans.forEach((plan) => console.log(`  ${plan.name.padEnd(12)}  ${plan.teacherMin}-${plan.teacherMax} teachers  ₹${plan.priceMonthly}/month`));
  console.log('\n── Admins ──────────────────────────────');
  console.log('  super@platform.edu      / password  (SUPER_ADMIN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());