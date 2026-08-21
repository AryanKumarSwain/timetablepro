require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

function getMysqlConfig() {
  if (process.env.DATABASE_HOST && process.env.DATABASE_USER && process.env.DATABASE_PASSWORD !== undefined && process.env.DATABASE_NAME) {
    return {
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT ?? 3306),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: 10,
    };
  }
  if (process.env.DATABASE_URL) {
    const parsed = new URL(process.env.DATABASE_URL.replace(/^"|"$/g, ''));
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      connectionLimit: 10,
    };
  }
  return {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'school_timetable',
    connectionLimit: 10,
  };
}

const adapter = new PrismaMariaDb(getMysqlConfig());
const prisma = new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });

async function main() {
  const now = new Date();
  console.log('[local-cron-js] Running plan expiration check at', now.toISOString());

  let plansExpired = 0;
  let plansQueued = 0;
  let plansSwitchedToFree = 0;

  try {
    const expiredSchools = await prisma.school.findMany({
      where: { planId: { not: null }, planEndsAt: { lt: now }, trialStatus: 'NONE' },
      include: { plan: true, queuedPlan: true },
    });

    for (const school of expiredSchools) {
      try {
        const adminUsers = await prisma.user.findMany({ where: { schoolId: school.id, role: 'ADMIN' } });

        if (school.queuedPlanId && school.queuedPlanStartsAt) {
          let queuedPlanEndsAt = new Date(school.queuedPlanStartsAt);
          if (process.env.NODE_ENV !== 'production') queuedPlanEndsAt = new Date(new Date(school.queuedPlanStartsAt).getTime() + 5 * 60 * 1000);
          else queuedPlanEndsAt.setMonth(queuedPlanEndsAt.getMonth() + 1);

          await prisma.school.update({ where: { id: school.id }, data: { planId: school.queuedPlanId, planStartsAt: school.queuedPlanStartsAt, planEndsAt: queuedPlanEndsAt, queuedPlanId: null, queuedPlanStartsAt: null, licenseStatus: 'ACTIVE', autoDowngradedAt: null } });

          for (const admin of adminUsers) {
            await prisma.notification.create({ data: { title: 'Plan Activated', message: `Your queued plan (${school.queuedPlan?.name || 'Plan'}) has been activated automatically after your previous plan expired.`, type: 'INFO', scope: 'SCHOOL_TEACHERS', schoolId: school.id, senderId: admin.id } });
          }

          plansQueued++;
          console.log(`[local-cron-js] Activated queued plan for ${school.name}`);
        } else {
          let freePlan = await prisma.saaSPlan.findFirst({ where: { name: 'Free' } });
          if (!freePlan) {
            freePlan = await prisma.saaSPlan.create({ data: { id: 'free-plan-default', name: 'Free', teacherMin: 0, teacherMax: 5, priceMonthly: 0, reportEnabled: false, attendanceEnabled: false, homeworkEnabled: false, exportFormats: [], watermarkRequired: true } });
          }

          await prisma.school.update({ where: { id: school.id }, data: { planId: freePlan.id, planStartsAt: null, planEndsAt: null, licenseStatus: 'ACTIVE', autoDowngradedAt: new Date() } });

          for (const admin of adminUsers) {
            await prisma.notification.create({ data: { title: 'Plan Expired', message: `Your paid plan (${school.plan?.name || 'Plan'}) has expired. Your school has been switched to the Free plan. Upgrade now to continue using premium features.`, type: 'INFO', scope: 'SCHOOL_TEACHERS', schoolId: school.id, senderId: admin.id } });
          }

          plansSwitchedToFree++;
          console.log(`[local-cron-js] Switched ${school.name} to free plan`);
        }

        plansExpired++;
      } catch (err) { console.error(`[local-cron-js] Failed processing ${school.name}:`, err); }
    }

    const schoolsWithPlans = await prisma.school.findMany({ where: { planId: { not: null }, trialStatus: 'NONE' }, include: { plan: true } });
    for (const school of schoolsWithPlans) {
      try {
        const teacherCount = await prisma.teacher.count({ where: { schoolId: school.id } });
        if (teacherCount === 0 && school.plan && Number(school.plan.priceMonthly) > 0) {
          let freePlan = await prisma.saaSPlan.findFirst({ where: { name: 'Free' } });
          if (!freePlan) freePlan = await prisma.saaSPlan.create({ data: { id: 'free-plan-default', name: 'Free', teacherMin: 0, teacherMax: 5, priceMonthly: 0, reportEnabled: false, attendanceEnabled: false, homeworkEnabled: false, exportFormats: [], watermarkRequired: true } });

          await prisma.school.update({ where: { id: school.id }, data: { planId: freePlan.id, planStartsAt: null, planEndsAt: null, licenseStatus: 'ACTIVE', autoDowngradedAt: new Date() } });

          const adminUsers = await prisma.user.findMany({ where: { schoolId: school.id, role: 'ADMIN' } });
          for (const admin of adminUsers) {
            await prisma.notification.create({ data: { title: 'Plan Updated', message: `Your school had no teachers and has been switched to the Free plan. Add teachers to re-enable paid plan features.`, type: 'INFO', scope: 'SCHOOL_TEACHERS', schoolId: school.id, senderId: admin.id } });
          }

          plansSwitchedToFree++;
          console.log(`[local-cron-js] Switched ${school.name} to free plan due to 0 teachers`);
        }
      } catch (err) { console.error(`[local-cron-js] Failed zero-teacher check for ${school.name}:`, err); }
    }

    console.log('[local-cron-js] Summary:', { plansExpired, plansQueued, plansSwitchedToFree });
  } catch (error) { console.error('[local-cron-js] Fatal error:', error); }
  finally { await prisma.$disconnect(); }
}

main();
