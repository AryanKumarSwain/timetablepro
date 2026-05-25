/**
 * MySQL connection settings for Prisma 7 driver adapter.
 * If your password contains @, #, or /, either URL-encode it in DATABASE_URL
 * (%40 for @) or set DATABASE_HOST / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME.
 */
export function getMysqlConfig() {
  if (
    process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD !== undefined &&
    process.env.DATABASE_NAME
  ) {
    return {
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT ?? 3306),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: 10,
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Set DATABASE_URL or DATABASE_HOST/USER/PASSWORD/NAME in .env'
    );
  }

  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    connectionLimit: 10,
  };
}
