const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findFirst();
    if (!school) {
      console.error('No school found in DB. Create a school first.');
      process.exit(1);
    }

    const plans = await prisma.saaSPlan.findMany();
    if (!plans || plans.length === 0) {
      console.error('No SaaS plans found. Seed plans first.');
      process.exit(1);
    }

    const sampleDates = [30, 60, 90]; // days ago

    for (let i = 0; i < Math.min(3, plans.length); i++) {
      const plan = plans[i];
      const daysAgo = sampleDates[i] || (30 * (i + 1));
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await prisma.subscriptionTransaction.create({
        data: {
          schoolId: school.id,
          planId: plan.id,
          amount: plan.priceMonthly,
          billingCycle: 'monthly',
          utrNumber: `TEST-UTR-${i + 1}`,
          phoneNumber: null,
          email: null,
          status: 'APPROVED',
          createdAt,
          updatedAt: createdAt,
        }
      });

      console.log(`Inserted sample transaction for plan ${plan.name} at ${createdAt.toISOString()}`);
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
