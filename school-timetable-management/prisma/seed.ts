import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  const basicPlan = await prisma.saaSPlan.upsert({
    where: { id: 'plan-basic' },
    update: {},
    create: {
      id: 'plan-basic',
      name: 'Basic (0-30)',
      teacherMin: 0,
      teacherMax: 30,
      priceMonthly: 49.99,
    },
  });

  const school = await prisma.school.upsert({
    where: { id: 'school-demo' },
    update: {},
    create: {
      id: 'school-demo',
      name: 'Demo International School',
      planId: basicPlan.id,
      licenseStatus: 'ACTIVE',
    },
  });

  const schoolId = school.id;

  await prisma.user.upsert({
    where: { email: 'super@platform.edu' },
    update: { password: passwordHash, role: 'SUPER_ADMIN', schoolId: null },
    create: {
      email: 'super@platform.edu',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      schoolId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: { password: passwordHash, role: 'ADMIN', schoolId },
    create: {
      email: 'admin@school.edu',
      password: passwordHash,
      role: 'ADMIN',
      schoolId,
    },
  });

  const subjects = await Promise.all(
    [
      { name: 'Physics', code: 'PHY101' },
      { name: 'Mathematics', code: 'MAT101' },
      { name: 'English', code: 'ENG101' },
      { name: 'Chemistry', code: 'CHE101' },
    ].map((s, i) =>
      prisma.subject.upsert({
        where: { id: `subject-${i + 1}` },
        update: {},
        create: { id: `subject-${i + 1}`, schoolId, ...s },
      })
    )
  );

  const periods = await Promise.all(
    [
      { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
      { periodNumber: 2, startTime: '08:50', endTime: '09:35' },
      { periodNumber: 3, startTime: '09:40', endTime: '10:25' },
      { periodNumber: 4, startTime: '10:45', endTime: '11:30' },
      { periodNumber: 5, startTime: '11:35', endTime: '12:20' },
    ].map((p, i) =>
      prisma.period.upsert({
        where: { id: `period-${i + 1}` },
        update: {},
        create: { id: `period-${i + 1}`, schoolId, ...p },
      })
    )
  );

  const classRoom = await prisma.classRoom.upsert({
    where: { id: 'class-10a' },
    update: {},
    create: {
      id: 'class-10a',
      schoolId,
      name: 'Class 10-A',
      grade: '10',
      section: 'A',
      roomNumber: '101',
    },
  });

  const rajesh = await prisma.teacher.upsert({
    where: { id: 'teacher-rajesh' },
    update: {},
    create: {
      id: 'teacher-rajesh',
      schoolId,
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh@school.edu',
      phone: '9876543210',
      subjectSpecialtyId: subjects[0].id,
    },
  });

  await prisma.teacher.upsert({
    where: { id: 'teacher-priya' },
    update: {},
    create: {
      id: 'teacher-priya',
      schoolId,
      name: 'Ms. Priya Sharma',
      email: 'priya@school.edu',
      phone: '9876543211',
      subjectSpecialtyId: subjects[2].id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'rajesh@school.edu' },
    update: { password: passwordHash, role: 'TEACHER', schoolId },
    create: {
      email: 'rajesh@school.edu',
      password: passwordHash,
      role: 'TEACHER',
      schoolId,
    },
  });

  const monday = 1;
  await prisma.weeklyTimetableSlot.upsert({
    where: { id: 'slot-demo-1' },
    update: {},
    create: {
      id: 'slot-demo-1',
      schoolId,
      dayOfWeek: monday,
      periodId: periods[0].id,
      classId: classRoom.id,
      subjectId: subjects[0].id,
      teacherId: rajesh.id,
    },
  });

  console.log('Seed complete.');
  console.log('  super@platform.edu / password');
  console.log('  admin@school.edu / password');
  console.log('  rajesh@school.edu / password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
