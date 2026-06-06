import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Generates the fallback MariaDB / MySQL connection string if raw discrete environment 
 * block parameters are supplied instead of a pre-formed standard single-string layout.
 */
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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Falls back safely to parsing separate blocks if DATABASE_URL isn't explicitly found
    url: env('DATABASE_URL') ?? getDatabaseUrl(),
  },
});