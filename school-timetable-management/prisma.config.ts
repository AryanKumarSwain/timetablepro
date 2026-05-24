import 'dotenv/config';
import { defineConfig, type PrismaConfig } from 'prisma/config';

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DATABASE_HOST ?? 'localhost';
  const port = process.env.DATABASE_PORT ?? '3306';
  const user = process.env.DATABASE_USER ?? 'root';
  const password = encodeURIComponent(process.env.DATABASE_PASSWORD ?? '');
  const database = process.env.DATABASE_NAME ?? 'school_timetable';

  return `mysql://${user}:${password}@${host}:${port}/${database}`;
}

const config = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: getDatabaseUrl(),
  },
} satisfies PrismaConfig;

export default defineConfig(config);
