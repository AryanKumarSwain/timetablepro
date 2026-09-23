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

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;