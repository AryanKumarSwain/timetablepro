import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { getMysqlConfig } from '@/lib/db-config';

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

function createPrismaClient() {
  const adapter = new PrismaMariaDb(getMysqlConfig());
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Assign and assert the clean camelCase mapping keys over the lowercased client keys
  const prisma = client as PrismaClient & {
    classRoom: typeof client.classroom;
    teacherAttendance: typeof client.teacherattendance;
    weeklyTimetableSlot: typeof client.weeklytimetableslot;
    replacementAssignment: typeof client.replacementassignment;
    saaSPlan: typeof client.saasplan;
    subscriptionTransaction: typeof client.subscriptiontransaction; // Added mapping type
  };

  prisma.classRoom ??= client.classroom;
  prisma.teacherAttendance ??= client.teacherattendance;
  prisma.weeklyTimetableSlot ??= client.weeklytimetableslot;
  prisma.replacementAssignment ??= client.replacementassignment;
  prisma.saaSPlan ??= client.saasplan;
  prisma.subscriptionTransaction ??= client.subscriptiontransaction; // Added runtime proxy value

  return prisma;
}

// Global caching layer to protect against hot reload duplication leaks in Next.js development
export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}