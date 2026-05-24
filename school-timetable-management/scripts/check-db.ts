import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, schoolId: true },
  });
  const schools = await prisma.school.count();
  const teachers = await prisma.teacher.count();

  console.log('Database:', process.env.DATABASE_NAME ?? 'from .env');
  console.log('Users:', users.length);
  users.forEach((u) => console.log(`  - ${u.email} (${u.role}) schoolId=${u.schoolId ?? 'null'}`));
  console.log('Schools:', schools, '| Teachers:', teachers);
}

main()
  .finally(() => prisma.$disconnect());
