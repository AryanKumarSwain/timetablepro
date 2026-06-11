
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { getMysqlConfig } from '@/lib/db-config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaMariaDb(getMysqlConfig());
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  const prisma = client as PrismaClient & {
    classRoom: typeof client.classroom;
    teacherAttendance: typeof client.teacherattendance;
    weeklyTimetableSlot: typeof client.weeklytimetableslot;
    replacementAssignment: typeof client.replacementassignment;
    saaSPlan: typeof client.saasplan;
  };

  prisma.classRoom ??= client.classroom;
  prisma.teacherAttendance ??= client.teacherattendance;
  prisma.weeklyTimetableSlot ??= client.weeklytimetableslot;
  prisma.replacementAssignment ??= client.replacementassignment;
  prisma.saaSPlan ??= client.saasplan;

  return prisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
