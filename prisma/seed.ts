import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  // ── Plans ─────────────────────────────────────────────────────────────────
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

  // ── School ────────────────────────────────────────────────────────────────
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

  // ── Super Admin ───────────────────────────────────────────────────────────
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

  // ── Admin ─────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'aryannn.ks@gmail.com' },
    update: { password: passwordHash, role: 'ADMIN', schoolId },
    create: {
      email: 'aryannn.ks@gmail.com',
      password: passwordHash,
      role: 'ADMIN',
      schoolId,
    },
  });

  // ── Subjects (10) ─────────────────────────────────────────────────────────
  const subjectData = [
    { name: 'Physics',          code: 'PHY101' },
    { name: 'Mathematics',      code: 'MAT101' },
    { name: 'English',          code: 'ENG101' },
    { name: 'Chemistry',        code: 'CHE101' },
    { name: 'Biology',          code: 'BIO101' },
    { name: 'History',          code: 'HIS101' },
    { name: 'Geography',        code: 'GEO101' },
    { name: 'Computer Science', code: 'CSC101' },
    { name: 'Economics',        code: 'ECO101' },
    { name: 'Physical Education', code: 'PE101' },
  ];

  const subjects = await Promise.all(
    subjectData.map((s, i) =>
      prisma.subject.upsert({
        where: { id: `subject-${i + 1}` },
        update: {},
        create: { id: `subject-${i + 1}`, schoolId, ...s },
      })
    )
  );

  // ── Periods (5) ───────────────────────────────────────────────────────────
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

  // ── Classes (12) ──────────────────────────────────────────────────────────
  // Grades 9 & 10 → sections A, B, C | Grades 11 & 12 → sections A, B, C
  const classData = [
    { id: 'class-9a',  name: 'Class 9-A',  grade: '9',  section: 'A', roomNumber: '101' },
    { id: 'class-9b',  name: 'Class 9-B',  grade: '9',  section: 'B', roomNumber: '102' },
    { id: 'class-9c',  name: 'Class 9-C',  grade: '9',  section: 'C', roomNumber: '103' },
    { id: 'class-10a', name: 'Class 10-A', grade: '10', section: 'A', roomNumber: '104' },
    { id: 'class-10b', name: 'Class 10-B', grade: '10', section: 'B', roomNumber: '105' },
    { id: 'class-10c', name: 'Class 10-C', grade: '10', section: 'C', roomNumber: '106' },
    { id: 'class-11a', name: 'Class 11-A', grade: '11', section: 'A', roomNumber: '201' },
    { id: 'class-11b', name: 'Class 11-B', grade: '11', section: 'B', roomNumber: '202' },
    { id: 'class-11c', name: 'Class 11-C', grade: '11', section: 'C', roomNumber: '203' },
    { id: 'class-12a', name: 'Class 12-A', grade: '12', section: 'A', roomNumber: '204' },
    { id: 'class-12b', name: 'Class 12-B', grade: '12', section: 'B', roomNumber: '205' },
    { id: 'class-12c', name: 'Class 12-C', grade: '12', section: 'C', roomNumber: '206' },
  ];

  const classRooms = await Promise.all(
    classData.map((c) =>
      prisma.classRoom.upsert({
        where: { id: c.id },
        update: {},
        create: { schoolId, ...c },
      })
    )
  );

  // ── Teachers (40) ─────────────────────────────────────────────────────────
  const teacherData = [
    // Physics (subject index 0) — 4 teachers
    { id: 'teacher-01', name: 'Dr. Rajesh Kumar',    email: 'rajesh.kumar@school.edu',    phone: '9800000001', subjectIdx: 0 },
    { id: 'teacher-02', name: 'Mr. Arjun Mehta',     email: 'arjun.mehta@school.edu',     phone: '9800000002', subjectIdx: 0 },
    { id: 'teacher-03', name: 'Ms. Sunita Rao',      email: 'sunita.rao@school.edu',      phone: '9800000003', subjectIdx: 0 },
    { id: 'teacher-04', name: 'Mr. Deepak Nair',     email: 'deepak.nair@school.edu',     phone: '9800000004', subjectIdx: 0 },
    // Mathematics (subject index 1) — 4 teachers
    { id: 'teacher-05', name: 'Ms. Kavita Joshi',    email: 'kavita.joshi@school.edu',    phone: '9800000005', subjectIdx: 1 },
    { id: 'teacher-06', name: 'Mr. Vikram Singh',    email: 'vikram.singh@school.edu',    phone: '9800000006', subjectIdx: 1 },
    { id: 'teacher-07', name: 'Ms. Ananya Gupta',    email: 'ananya.gupta@school.edu',    phone: '9800000007', subjectIdx: 1 },
    { id: 'teacher-08', name: 'Mr. Rohit Verma',     email: 'rohit.verma@school.edu',     phone: '9800000008', subjectIdx: 1 },
    // English (subject index 2) — 4 teachers
    { id: 'teacher-09', name: 'Ms. Priya Sharma',    email: 'priya.sharma@school.edu',    phone: '9800000009', subjectIdx: 2 },
    { id: 'teacher-10', name: 'Mr. Samuel D\'Souza', email: 'samuel.dsouza@school.edu',   phone: '9800000010', subjectIdx: 2 },
    { id: 'teacher-11', name: 'Ms. Neha Iyer',       email: 'neha.iyer@school.edu',       phone: '9800000011', subjectIdx: 2 },
    { id: 'teacher-12', name: 'Mr. Thomas Mathew',   email: 'thomas.mathew@school.edu',   phone: '9800000012', subjectIdx: 2 },
    // Chemistry (subject index 3) — 4 teachers
    { id: 'teacher-13', name: 'Dr. Meena Pillai',    email: 'meena.pillai@school.edu',    phone: '9800000013', subjectIdx: 3 },
    { id: 'teacher-14', name: 'Mr. Suresh Patil',    email: 'suresh.patil@school.edu',    phone: '9800000014', subjectIdx: 3 },
    { id: 'teacher-15', name: 'Ms. Rekha Desai',     email: 'rekha.desai@school.edu',     phone: '9800000015', subjectIdx: 3 },
    { id: 'teacher-16', name: 'Mr. Kiran Bhat',      email: 'kiran.bhat@school.edu',      phone: '9800000016', subjectIdx: 3 },
    // Biology (subject index 4) — 4 teachers
    { id: 'teacher-17', name: 'Ms. Divya Menon',     email: 'divya.menon@school.edu',     phone: '9800000017', subjectIdx: 4 },
    { id: 'teacher-18', name: 'Mr. Anil Saxena',     email: 'anil.saxena@school.edu',     phone: '9800000018', subjectIdx: 4 },
    { id: 'teacher-19', name: 'Ms. Pooja Tiwari',    email: 'pooja.tiwari@school.edu',    phone: '9800000019', subjectIdx: 4 },
    { id: 'teacher-20', name: 'Mr. Ganesh Reddy',    email: 'ganesh.reddy@school.edu',    phone: '9800000020', subjectIdx: 4 },
    // History (subject index 5) — 4 teachers
    { id: 'teacher-21', name: 'Ms. Lakshmi Nair',    email: 'lakshmi.nair@school.edu',    phone: '9800000021', subjectIdx: 5 },
    { id: 'teacher-22', name: 'Mr. Ravi Shankar',    email: 'ravi.shankar@school.edu',    phone: '9800000022', subjectIdx: 5 },
    { id: 'teacher-23', name: 'Ms. Sudha Krishnan',  email: 'sudha.krishnan@school.edu',  phone: '9800000023', subjectIdx: 5 },
    { id: 'teacher-24', name: 'Mr. Prasad Kulkarni', email: 'prasad.kulkarni@school.edu', phone: '9800000024', subjectIdx: 5 },
    // Geography (subject index 6) — 4 teachers
    { id: 'teacher-25', name: 'Ms. Usha Pandey',     email: 'usha.pandey@school.edu',     phone: '9800000025', subjectIdx: 6 },
    { id: 'teacher-26', name: 'Mr. Mohan Das',       email: 'mohan.das@school.edu',       phone: '9800000026', subjectIdx: 6 },
    { id: 'teacher-27', name: 'Ms. Geeta Mishra',    email: 'geeta.mishra@school.edu',    phone: '9800000027', subjectIdx: 6 },
    { id: 'teacher-28', name: 'Mr. Santosh Yadav',   email: 'santosh.yadav@school.edu',   phone: '9800000028', subjectIdx: 6 },
    // Computer Science (subject index 7) — 4 teachers
    { id: 'teacher-29', name: 'Mr. Nikhil Agarwal',  email: 'nikhil.agarwal@school.edu',  phone: '9800000029', subjectIdx: 7 },
    { id: 'teacher-30', name: 'Ms. Shruti Kapoor',   email: 'shruti.kapoor@school.edu',   phone: '9800000030', subjectIdx: 7 },
    { id: 'teacher-31', name: 'Mr. Amit Chauhan',    email: 'amit.chauhan@school.edu',    phone: '9800000031', subjectIdx: 7 },
    { id: 'teacher-32', name: 'Ms. Ritika Shah',     email: 'ritika.shah@school.edu',     phone: '9800000032', subjectIdx: 7 },
    // Economics (subject index 8) — 4 teachers
    { id: 'teacher-33', name: 'Mr. Harish Chandra',  email: 'harish.chandra@school.edu',  phone: '9800000033', subjectIdx: 8 },
    { id: 'teacher-34', name: 'Ms. Manju Bhatt',     email: 'manju.bhatt@school.edu',     phone: '9800000034', subjectIdx: 8 },
    { id: 'teacher-35', name: 'Mr. Vinod Tripathi',  email: 'vinod.tripathi@school.edu',  phone: '9800000035', subjectIdx: 8 },
    { id: 'teacher-36', name: 'Ms. Shalini Jain',    email: 'shalini.jain@school.edu',    phone: '9800000036', subjectIdx: 8 },
    // Physical Education (subject index 9) — 4 teachers
    { id: 'teacher-37', name: 'Mr. Rajendra Patel',  email: 'rajendra.patel@school.edu',  phone: '9800000037', subjectIdx: 9 },
    { id: 'teacher-38', name: 'Ms. Kamla Devi',      email: 'kamla.devi@school.edu',      phone: '9800000038', subjectIdx: 9 },
    { id: 'teacher-39', name: 'Mr. Brijesh Rawat',   email: 'brijesh.rawat@school.edu',   phone: '9800000039', subjectIdx: 9 },
    { id: 'teacher-40', name: 'Ms. Nandini Shetty',  email: 'nandini.shetty@school.edu',  phone: '9800000040', subjectIdx: 9 },
  ];

  const teachers = await Promise.all(
    teacherData.map((t) =>
      prisma.teacher.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          schoolId,
          name: t.name,
          email: t.email,
          phone: t.phone,
          subjectSpecialtyId: subjects[t.subjectIdx].id,
          joinDate: '2022-06-01',
        },
      })
    )
  );

  // Create user accounts for all teachers
  await Promise.all(
    teacherData.map((t) =>
      prisma.user.upsert({
        where: { email: t.email },
        update: { password: passwordHash, role: 'TEACHER', schoolId },
        create: {
          email: t.email,
          password: passwordHash,
          role: 'TEACHER',
          schoolId,
        },
      })
    )
  );

  // ── Demo timetable slot (Mon period-1, Class 10-A, Physics) ───────────────
  await prisma.weeklyTimetableSlot.upsert({
    where: { id: 'slot-demo-1' },
    update: {},
    create: {
      id: 'slot-demo-1',
      schoolId,
      dayOfWeek: 1,
      periodId: periods[0].id,
      classId: classRooms[3].id,   // class-10a
      subjectId: subjects[0].id,   // Physics
      teacherId: teachers[0].id,   // Dr. Rajesh Kumar
    },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('✅ Seed complete.');
  console.log('\n── Admins ──────────────────────────────');
  console.log('  super@platform.edu      / password  (SUPER_ADMIN)');
  console.log('  aryannn.ks@gmail.com    / password  (ADMIN)');
  console.log('\n── Subjects (10) ───────────────────────');
  subjectData.forEach((s) => console.log(`  ${s.code}  ${s.name}`));
  console.log('\n── Classes (12) ────────────────────────');
  classData.forEach((c) => console.log(`  ${c.name}  Room ${c.roomNumber}`));
  console.log('\n── Teachers (40) ───────────────────────');
  teacherData.forEach((t) => console.log(`  ${t.name.padEnd(28)}  ${t.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());