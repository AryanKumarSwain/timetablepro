import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  const adminPasswordHash = await bcrypt.hash('a@123', 10);
  const teacherPasswordHash = await bcrypt.hash('password', 10);

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
      teacherMax: 15,
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
      teacherMin: 16,
      teacherMax: 30,
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
      teacherMin: 31,
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

  const elitePlan = await prisma.saaSPlan.findUnique({ where: { id: 'plan-elite' } });
  if (!elitePlan) {
    throw new Error('Elite plan was not created during seed.');
  }

  // ── School ────────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 'school-demo' },
    update: { planId: elitePlan.id },
    create: {
      id: 'school-demo',
      name: 'Demo International School',
      licenseStatus: 'ACTIVE',
      planId: elitePlan.id,
    },
  });

  const schoolId = school.id;

  // ── Super Admin ───────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'super@platform.edu' },
    update: { 
      password: adminPasswordHash, 
      role: 'SUPER_ADMIN', 
      schoolId: null 
    },
    create: {
      email: 'super@platform.edu',
      password: adminPasswordHash,
      role: 'SUPER_ADMIN',
      schoolId: null,
    },
  });

  // ── School Admin ───────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'a@123' },
    update: {
      password: adminPasswordHash,
      role: 'ADMIN',
      schoolId: schoolId,
    },
    create: {
      email: 'a@123',
      password: adminPasswordHash,
      role: 'ADMIN',
      schoolId: schoolId,
    },
  });

  // ── Teachers ───────────────────────────────────────────────────────────────
  const teacherNames = [
    'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh',
    'Anjali Gupta', 'Rahul Verma', 'Pooja Mishra', 'Sanjay Joshi', 'Kavita Nair',
    'Deepak Mehta', 'Neha Kapoor', 'Suresh Iyer', 'Ritu Agarwal', 'Manoj Bhatia',
    'Sunita Choudhury', 'Vijay Deshmukh', 'Meena Srinivasan', 'Rakesh Pillai', 'Lakshmi Prasad'
  ];

  // We can go back to clean upserts since email is now unique!
  const teachers = await Promise.all(
    teacherNames.map((name, index) => {
      // replace all spaces globally
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}@school.edu`; 
      
      return prisma.teacher.upsert({
        where: { email },
        update: { name, schoolId },
        create: {
          name,
          email,
          schoolId,
          joinDate: new Date().toISOString().split('T')[0],
          phone: `9876543${String(index).padStart(3, '0')}` // <-- Fixed: Added required unique mock phone value
        },
      });
    })
  );

  // ── Classes ─────────────────────────────────────────────────────────────────
// ── Classes ─────────────────────────────────────────────────────────────────
  const classes = [
    { grade: '1', section: 'A', roomNumber: '101' },
    { grade: '1', section: 'B', roomNumber: '102' },
    { grade: '2', section: 'A', roomNumber: '103' },
    { grade: '2', section: 'B', roomNumber: '104' },
    { grade: '3', section: 'A', roomNumber: '105' },
    { grade: '3', section: 'B', roomNumber: '106' },
    { grade: '4', section: 'A', roomNumber: '107' },
    { grade: '4', section: 'B', roomNumber: '108' },
    { grade: '5', section: 'A', roomNumber: '109' },
    { grade: '5', section: 'B', roomNumber: '110' },
    { grade: '6', section: 'A', roomNumber: '111' },
    { grade: '6', section: 'B', roomNumber: '112' },
  ];

  await Promise.all(
    classes.map((cls) =>
      prisma.classRoom.upsert({
        where: { id: `${cls.grade}-${cls.section}-${schoolId}` },
        update: {},
        create: {
          id: `${cls.grade}-${cls.section}-${schoolId}`,
          name: `Class ${cls.grade}-${cls.section}`, // <-- Fixed: Added the missing required 'name' field
          grade: cls.grade,
          section: cls.section,
          roomNumber: cls.roomNumber,
          schoolId,
        },
      })
    )
  );

  // ── Subjects ───────────────────────────────────────────────────────────────
  const subjects = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English', code: 'ENG' },
    { name: 'Science', code: 'SCI' },
    { name: 'Social Studies', code: 'SST' },
    { name: 'Hindi', code: 'HIN' },
    { name: 'Computer Science', code: 'CS' },
  ];

  await Promise.all(
    subjects.map((sub) =>
      prisma.subject.upsert({
        where: { id: `${sub.code}-${schoolId}` },
        update: {},
        create: {
          id: `${sub.code}-${schoolId}`,
          name: sub.name,
          code: sub.code,
          schoolId,
        },
      })
    )
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('✅ Seed complete.');
  console.log('\n── Plans ────────────────────────────────');
  plans.forEach((plan) => console.log(`  ${plan.name.padEnd(12)}  ${plan.teacherMin}-${plan.teacherMax} teachers  ₹${plan.priceMonthly}/month`));
  console.log('\n── Admins ──────────────────────────────');
  console.log('  super@platform.edu      / a@123     (SUPER_ADMIN)');
  console.log('  a@123                   / a@123     (ADMIN)');
  console.log('\n── Teachers ────────────────────────────');
  console.log(`  Created ${teachers.length} teachers`);
  console.log('\n── Classes ──────────────────────────────');
  console.log(`  Created ${classes.length} classes (Grades 1-6, Sections A-B)`);
  console.log('\n── Subjects ─────────────────────────────');
  console.log(`  Created ${subjects.length} subjects`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());