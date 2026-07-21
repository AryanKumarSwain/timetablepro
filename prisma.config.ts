import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Generates the fallback MariaDB / MySQL connection string if raw discrete environment 
 * block parameters are supplied instead of a pre-formed standard single-string layout.
 */
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const params = 'allowPublicKeyRetrieval=true&ssl=false';
    if (url.includes('?')) {
      // If the URL already has query params, add missing ones
      const hasAllow = url.includes('allowPublicKeyRetrieval');
      const hasSsl = url.includes('ssl=');
      let suffix = '';
      if (!hasAllow) suffix += (suffix ? '&' : '') + 'allowPublicKeyRetrieval=true';
      if (!hasSsl) suffix += (suffix ? '&' : '') + 'ssl=false';
      return suffix ? `${url}&${suffix}` : url;
    }
    return `${url}?${params}`;
  }

  const host = process.env.DATABASE_HOST ?? 'localhost';
  const port = process.env.DATABASE_PORT ?? '3306';
  const user = process.env.DATABASE_USER ?? 'root';
  const password = encodeURIComponent(process.env.DATABASE_PASSWORD ?? '');
  const database = process.env.DATABASE_NAME ?? 'school_timetable';

  // append default params for local MariaDB auth
  const params = 'allowPublicKeyRetrieval=true&ssl=false';
  return `mysql://${user}:${password}@${host}:${port}/${database}?${params}`;
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